/**
 * CSV Bulk Import Script
 * Reads LinkedIn Connections.csv and upserts all contacts into the DB.
 * Run from apps/api/:  npx ts-node prisma/import-csv.ts <path-to-csv>
 *
 * Classification logic (by Position/Company text):
 *   abogados   → abogad*, lawyer, legal, jurídic*, derecho, bufete, despacho, notari*, fiscal*
 *   recruiters → recruit*, talent, headhunter, rrhh, hr partner, people partner, selección, staffing, sourcer
 *   otros      → everything else
 */

import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient, PersonStatus, PersonSource } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Niche classifier ────────────────────────────────────────────────────────

const ABOGADOS_RE = /abogad|lawyer|legal|jurídi|juridic|derecho|bufete|despacho|notari|fiscal|procurad|magistrad|tribunal|jurista|law firm|counsel|attorney/i;
const RECRUITERS_RE = /recruit|talent|headhunter|rrhh|hr partner|hr manager|hr director|people partner|people ops|selección|seleccion|staffing|sourcer|talent acquisition|head of people|recursos humanos/i;

function classifyNiche(position: string, company: string): 'abogados' | 'recruiters' | 'otros' {
  const text = `${position} ${company}`;
  if (ABOGADOS_RE.test(text))   return 'abogados';
  if (RECRUITERS_RE.test(text)) return 'recruiters';
  return 'otros';
}

// ─── CSV parser ───────────────────────────────────────────────────────────────

function parseCSV(filePath: string): Array<Record<string, string>> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines   = content.split(/\r?\n/);

  // Find the real header line (starts with "First Name")
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

function parseLinkedInDate(str: string): Date | null {
  // LinkedIn format: "05 Oct 2026"
  if (!str || !str.trim()) return null;
  const d = new Date(str.trim());
  return isNaN(d.getTime()) ? null : d;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const csvPath = process.argv[2] ?? path.join(__dirname, '../../tmp/linkedin_export2/Connections.csv');

  if (!fs.existsSync(csvPath)) {
    console.error('CSV not found at:', csvPath);
    process.exit(1);
  }

  console.log('📂 Reading CSV:', csvPath);
  const rows = parseCSV(csvPath);
  console.log(`📊 Found ${rows.length} connections\n`);

  // Load niches
  const niches = await prisma.niche.findMany();
  const nicheMap = Object.fromEntries(niches.map(n => [n.slug, n.id]));

  const stats = { created: 0, updated: 0, skipped: 0, abogados: 0, recruiters: 0, otros: 0 };

  for (const row of rows) {
    const firstName = row['First Name']?.trim();
    const lastName  = row['Last Name']?.trim();
    const url       = row['URL']?.trim();
    const company   = row['Company']?.trim() ?? '';
    const position  = row['Position']?.trim() ?? '';
    const connectedOn = parseLinkedInDate(row['Connected On']);

    // Skip rows without a LinkedIn URL (can't upsert without unique key)
    if (!url || !firstName) {
      stats.skipped++;
      continue;
    }

    const nicheSlug  = classifyNiche(position, company);
    const nicheId    = nicheMap[nicheSlug];

    stats[nicheSlug]++;

    try {
      const existing = await prisma.person.findUnique({ where: { linkedinUrl: url } });

      if (existing) {
        // Update niche if not yet classified, and fill in missing fields
        await prisma.person.update({
          where: { linkedinUrl: url },
          data: {
            ...(existing.nicheId ? {} : { nicheId }),
            ...(connectedOn && !existing.linkedinConnectedOn ? { linkedinConnectedOn: connectedOn } : {}),
            ...(company && !existing.jobTitle ? { jobTitle: position || null } : {}),
          },
        });
        stats.updated++;
      } else {
        await prisma.person.create({
          data: {
            linkedinUrl:        url,
            firstName,
            lastName:           lastName ?? '',
            jobTitle:           position || null,
            nicheId,
            status:             PersonStatus.CONNECTED,
            source:             PersonSource.CSV_IMPORT,
            linkedinConnectedOn: connectedOn,
            // Company name only — no full Apify data yet
            // We store it in tags temporarily until Apify scrape runs
            tags:               company ? [`company:${company.slice(0, 80)}`] : [],
          },
        });
        stats.created++;
      }
    } catch (err: unknown) {
      console.error(`  ⚠️  Error on ${firstName} ${lastName} (${url}):`, (err as Error).message);
      stats.skipped++;
    }
  }

  console.log('\n✅ Import complete!');
  console.log(`   Created:    ${stats.created}`);
  console.log(`   Updated:    ${stats.updated}`);
  console.log(`   Skipped:    ${stats.skipped}`);
  console.log(`\n   Abogados:   ${stats.abogados}`);
  console.log(`   Recruiters: ${stats.recruiters}`);
  console.log(`   Otros:      ${stats.otros}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
