/**
 * CSV Bulk Import — Step 1: diff + scrape
 *
 * Reads a LinkedIn Connections.csv. Rows with no name/URL but a connection
 * date are closed/deleted LinkedIn accounts (LinkedIn only exports the date
 * in that case) — those are upserted directly as ACCOUNT_DELETED (no Apify
 * call needed, there's no profile to scrape) so the DB's total connection
 * count matches LinkedIn's own count 1-1, while staying excluded from the
 * normal contacts list (see ContactsService.findAll).
 *
 * Everything else is diffed against the DB: by default only rows whose
 * linkedinUrl is NOT already present are scraped, so a later CSV export only
 * costs Apify credits for genuinely new connections. Pass --force-all to
 * re-scrape every row regardless (used once, for the 2026-10 backfill where
 * most existing contacts were CSV-imported before Apify enrichment existed).
 *
 * New URLs are batched to the harvestapi actor (~50 per call, one Apify run
 * per batch instead of one per profile) and written to a JSON file.
 *
 * Niche classification is deliberately NOT done here — see import-csv-apply.ts.
 * The regex classifier in the old import-csv.ts only knew 2 niches and missed
 * ambiguous cases (e.g. a "Head of People" at a law firm); niche assignment
 * now happens by reading each profile's real headline/about/position, which
 * Samuel does together with Claude in conversation before the apply step.
 *
 * Run from apps/api/:
 *   npx ts-node prisma/import-csv-scrape.ts <path-to-csv> [--force-all] [--out=file.json]
 */

import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient, PersonStatus, PersonSource } from '@prisma/client';
import { ApifyClient } from 'apify-client';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const ACTOR_ID = 'LpVuK3Zozwuipa5bp'; // harvestapi/linkedin-profile-scraper
// 10, not 50 — the actor itself caps free-tier runs at 10 items regardless
// of how many queries are sent; a batch of 50 against a free account
// returns 0 results for the whole batch ("free user item limit exceeded"),
// confirmed against a real run on 2026-10-10.
const BATCH_SIZE = 10;

const prisma = new PrismaClient();

// ─── CSV parser (same logic as the original import-csv.ts) ───────────────────

function parseCSV(filePath: string): Array<Record<string, string>> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);

  const headerIdx = lines.findIndex(l => l.startsWith('First Name'));
  if (headerIdx === -1) throw new Error('Could not find header row in CSV');

  const headers = parseCSVLine(lines[headerIdx]);
  const rows: Array<Record<string, string>> = [];

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVLine(line);
    if (values.length < headers.length) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h.trim()] = (values[idx] ?? '').trim(); });
    rows.push(row);
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/**
 * LinkedIn's export format is always "DD Mon YYYY" (e.g. "17 Mar 2023").
 * `new Date(str)` parses that in the PROCESS's local timezone, so the same
 * CSV date produces a different UTC instant — and therefore a different
 * .toISOString() — depending on what machine/timezone runs this script.
 * Confirmed real: the dedup-by-date-key logic below compared a date parsed
 * this way against the same date already stored in the DB from an earlier
 * run, got two different strings for the same CSV row, and created a
 * duplicate ACCOUNT_DELETED row (2026-10-11 incident, the "fix" that didn't
 * actually fix it because both sides shared the same timezone leak). Build
 * the UTC midnight instant directly from the parsed day/month/year instead
 * of handing an ambiguous string to the Date constructor.
 */
function parseLinkedInDate(str: string): Date | null {
  if (!str || !str.trim()) return null;
  const m = str.trim().match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const month = MONTHS[m[2].toLowerCase()];
  const year = parseInt(m[3], 10);
  if (month === undefined) return null;
  return new Date(Date.UTC(year, month, day));
}

/**
 * The CSV export percent-encodes non-ASCII characters in the URL
 * (…/in/blanca-li%C3%B1an-...), but the Apify actor returns linkedinUrl
 * already decoded (…/in/blanca-liñan-...). Comparing/keying on the raw
 * strings silently fails for every accented name — confirmed against a real
 * run on 2026-10-10/11: 100 of 477 profiles came back correctly scraped but
 * unmatched against the CSV map, miscounted as "failed" and missing their
 * connectedOn date. Decode both sides before any comparison or Map key.
 */
function normalizeUrl(url: string): string {
  try { return decodeURI(url); } catch { return url; }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const csvPath = args.find(a => !a.startsWith('--'));
  const forceAll = args.includes('--force-all');
  const outArg = args.find(a => a.startsWith('--out='));
  const outPath = outArg ? outArg.slice('--out='.length) : path.join(__dirname, '../../tmp/csv-import-scraped.json');

  if (!csvPath) {
    console.error('Usage: npx ts-node prisma/import-csv-scrape.ts <path-to-csv> [--force-all] [--out=file.json]');
    process.exit(1);
  }
  if (!fs.existsSync(csvPath)) {
    console.error('CSV not found at:', csvPath);
    process.exit(1);
  }

  const apifyToken = process.env.APIFY_TOKEN;
  if (!apifyToken) {
    console.error('APIFY_TOKEN not set in .env');
    process.exit(1);
  }

  console.log('📂 Reading CSV:', csvPath);
  const rows = parseCSV(csvPath);
  console.log(`📊 Found ${rows.length} rows in CSV`);

  // ─── Closed/deleted accounts: no name, no URL, only a connection date ────
  // Upserted directly — there's no profile to scrape, and no stable natural
  // key across re-exports (LinkedIn gives nothing but the date), so these
  // are keyed on a synthetic URL derived from the date to stay idempotent
  // across repeated runs of this same CSV rather than growing duplicates.
  const closedRows = rows.filter(r => !r['URL']?.trim() && !r['First Name']?.trim());
  let closedCreated = 0;
  // Match against EXISTING ACCOUNT_DELETED rows by connectedOn date, not by
  // re-deriving the same synthetic URL — the synthetic URL scheme has already
  // changed once (line-number-based, then timestamp-based), and a Date's
  // ISO string also shifts with the process's local timezone, so re-deriving
  // it is not a stable key across runs. Confirmed real: two different
  // synthetic URLs were generated for the identical CSV row on two different
  // runs, duplicating the same closed account (2026-10-11 incident). Querying
  // by the actual date column is the only thing both past and future runs
  // agree on.
  const existingClosed = await prisma.person.findMany({
    where: { status: PersonStatus.ACCOUNT_DELETED },
    select: { id: true, linkedinConnectedOn: true },
  });
  const existingClosedDates = new Set(
    existingClosed.map(p => p.linkedinConnectedOn?.toISOString().slice(0, 10)).filter(Boolean),
  );
  for (const row of closedRows) {
    const connectedOn = parseLinkedInDate(row['Connected On']);
    const dateKey = connectedOn?.toISOString().slice(0, 10);
    if (dateKey && existingClosedDates.has(dateKey)) continue; // already recorded

    const syntheticUrl = `https://www.linkedin.com/in/deleted-account-${row['Connected On']?.trim() || 'unknown'}`
      .toLowerCase().replace(/\s+/g, '-');
    await prisma.person.create({
      data: {
        linkedinUrl: syntheticUrl,
        firstName: 'LinkedIn',
        lastName: 'Member (cuenta eliminada)',
        status: PersonStatus.ACCOUNT_DELETED,
        source: PersonSource.CSV_IMPORT,
        linkedinConnectedOn: connectedOn,
        tags: ['cuenta_cerrada'],
      },
    });
    if (dateKey) existingClosedDates.add(dateKey);
    closedCreated++;
  }
  console.log(`🗑️  Closed/deleted accounts: ${closedRows.length} in CSV, ${closedCreated} newly recorded`);

  // ─── Diff against DB: scrape only new connections, unless --force-all ───
  const existing = await prisma.person.findMany({ select: { linkedinUrl: true } });
  const existingUrls = new Set(existing.map(p => normalizeUrl(p.linkedinUrl)));

  const candidates = rows.filter(r => r['URL']?.trim() && r['First Name']?.trim());
  const isNew = (r: Record<string, string>) => !existingUrls.has(normalizeUrl(r['URL'].trim()));
  const newCount = candidates.filter(isNew).length;
  const targetRows = forceAll ? candidates : candidates.filter(isNew);

  console.log(`✅ Already in DB: ${candidates.length - newCount}`);
  console.log(`🆕 New connections: ${newCount}`);
  console.log(forceAll
    ? `🔁 --force-all: re-scraping all ${targetRows.length} connections regardless of DB state`
    : `   Scraping only the new ones: ${targetRows.length}`);

  if (targetRows.length === 0) {
    console.log('Nothing to scrape — exiting.');
    return;
  }

  // Keep the CSV's own fields alongside the scrape result, so the apply step
  // can fall back to them (connectedOn date, raw company/position text) for
  // anything Apify doesn't return.
  const csvByUrl = new Map(targetRows.map(r => [normalizeUrl(r['URL'].trim()), {
    firstName: r['First Name']?.trim() ?? '',
    lastName: r['Last Name']?.trim() ?? '',
    company: r['Company']?.trim() ?? '',
    position: r['Position']?.trim() ?? '',
    connectedOn: parseLinkedInDate(r['Connected On'])?.toISOString() ?? null,
  }]));

  const client = new ApifyClient({ token: apifyToken });
  const urls = [...csvByUrl.keys()];
  const scraped: Array<Record<string, unknown>> = [];
  const failed: string[] = [];

  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(urls.length / BATCH_SIZE);
    console.log(`\n🔄 Batch ${batchNum}/${totalBatches} — scraping ${batch.length} profiles via Apify...`);

    try {
      const run = await client.actor(ACTOR_ID).call({
        profileScraperMode: 'Profile details no email ($4 per 1k)',
        queries: batch,
      });
      const { items } = await client.dataset(run.defaultDatasetId).listItems();

      const returnedUrls = new Set<string>();
      for (const item of items as Array<Record<string, unknown>>) {
        const url = item.linkedinUrl ? normalizeUrl(item.linkedinUrl as string) : undefined;
        if (url) returnedUrls.add(url);
        scraped.push({ ...item, csvData: csvByUrl.get(url ?? '') ?? null });
      }

      const missing = batch.filter(u => !returnedUrls.has(u));
      if (missing.length > 0) {
        console.warn(`  ⚠️  ${missing.length} URL(s) in this batch returned no data`);
        failed.push(...missing);
      }
      console.log(`  ✅ Batch ${batchNum} done — ${returnedUrls.size}/${batch.length} profiles scraped`);
    } catch (err) {
      console.error(`  ❌ Batch ${batchNum} failed entirely:`, (err as Error).message);
      failed.push(...batch);
    }
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify({ scrapedAt: new Date().toISOString(), profiles: scraped, failedUrls: failed }, null, 2));

  console.log(`\n✅ Scrape complete.`);
  console.log(`   Scraped:  ${scraped.length}`);
  console.log(`   Failed:   ${failed.length}`);
  console.log(`\n📝 Written to: ${outPath}`);
  console.log(`   Next: classify each profile's niche, then run import-csv-apply.ts with the classification.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
