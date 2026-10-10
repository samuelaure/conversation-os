/**
 * CSV Bulk Import — Step 2: apply niche classification + upsert
 *
 * Reads the scraped-profiles JSON from import-csv-scrape.ts and a
 * classifications JSON (one { linkedinUrl, nicheSlug } per profile, produced
 * by reading each profile's real headline/about/position — not a regex,
 * see import-csv-scrape.ts header comment for why), then upserts every
 * profile via the same upsertContactFromApifyProfile() the single-import
 * queue uses, so Company/Person field mapping never drifts between paths.
 *
 * Run from apps/api/:
 *   npx ts-node prisma/import-csv-apply.ts <scraped.json> <classifications.json>
 */

import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient, PersonSource, PersonStatus } from '@prisma/client';
import { upsertContactFromApifyProfile } from '../src/contacts/contact-upsert.util';
import { LinkedInProfileRaw } from '../src/contacts/apify.service';

const prisma = new PrismaClient();

interface Classification {
  linkedinUrl: string;
  nicheSlug: string | null; // null = leave unclassified, review manually later
}

async function main() {
  const scrapedPath = process.argv[2];
  const classificationsPath = process.argv[3];

  if (!scrapedPath || !classificationsPath) {
    console.error('Usage: npx ts-node prisma/import-csv-apply.ts <scraped.json> <classifications.json>');
    process.exit(1);
  }

  const scrapedRaw = JSON.parse(fs.readFileSync(scrapedPath, 'utf-8')) as {
    profiles: Array<LinkedInProfileRaw & { csvData?: { connectedOn: string | null } | null }>;
  };
  console.log(`📂 Loaded ${scrapedRaw.profiles.length} scraped profiles, ${classificationsPath}`);
  const classifications = JSON.parse(fs.readFileSync(classificationsPath, 'utf-8')) as Classification[];

  const nicheBySlug = new Map((await prisma.niche.findMany()).map(n => [n.slug, n.id]));
  const classByUrl = new Map(classifications.map(c => [c.linkedinUrl, c.nicheSlug]));

  const stats = { created: 0, updated: 0, skipped: 0, unclassified: 0 };
  const nicheCounts: Record<string, number> = {};

  for (const profile of scrapedRaw.profiles) {
    if (!profile.linkedinUrl) { stats.skipped++; continue; }

    const nicheSlug = classByUrl.get(profile.linkedinUrl) ?? null;
    const nicheId = nicheSlug ? nicheBySlug.get(nicheSlug) ?? null : null;
    if (nicheSlug && !nicheId) {
      console.warn(`  ⚠️  Unknown niche slug "${nicheSlug}" for ${profile.linkedinUrl} — leaving unclassified`);
    }
    if (!nicheId) stats.unclassified++;
    else nicheCounts[nicheSlug!] = (nicheCounts[nicheSlug!] ?? 0) + 1;

    try {
      const existedBefore = await prisma.person.findUnique({ where: { linkedinUrl: profile.linkedinUrl } });

      const connectedOn = profile.csvData?.connectedOn ? new Date(profile.csvData.connectedOn) : null;

      await upsertContactFromApifyProfile(prisma, profile, {
        // Only seed CONNECTED on a brand-new contact. Re-enriching an
        // existing one (e.g. a --force-all backfill) must never touch
        // status — it would reset real pipeline progress (RESPONDED,
        // RESEARCH_INVITED, etc.) back to CONNECTED on every re-run.
        status: existedBefore ? undefined : PersonStatus.CONNECTED,
        source: PersonSource.APIFY_IMPORT,
        // A confident new classification always applies (even over a prior
        // one — the new one was made with real Apify data, the old regex
        // wasn't). But never overwrite an existing niche with "unclassified"
        // just because this pass couldn't confidently re-decide it.
        nicheId: nicheId !== null ? nicheId : existedBefore?.nicheId ?? null,
        linkedinConnectedOn: connectedOn,
      });

      if (existedBefore) stats.updated++;
      else stats.created++;
    } catch (err) {
      console.error(`  ⚠️  Error on ${profile.firstName} ${profile.lastName} (${profile.linkedinUrl}):`, (err as Error).message);
      stats.skipped++;
    }
  }

  console.log('\n✅ Apply complete!');
  console.log(`   Created:      ${stats.created}`);
  console.log(`   Updated:      ${stats.updated}`);
  console.log(`   Skipped:      ${stats.skipped}`);
  console.log(`   Unclassified: ${stats.unclassified}`);
  console.log('\n   By niche:');
  for (const [slug, count] of Object.entries(nicheCounts)) {
    console.log(`     ${slug}: ${count}`);
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
