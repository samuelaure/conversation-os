import { PrismaClient, PersonStatus, PersonSource } from '@prisma/client';
import { LinkedInProfileRaw } from './apify.service';

/**
 * Shared Apify-profile → Person/Company upsert, used by both the single-contact
 * import queue (contact-import.processor.ts) and the bulk CSV import script —
 * kept in one place so the field mapping never drifts between the two paths.
 */
export async function upsertContactFromApifyProfile(
  prisma: PrismaClient,
  profile: LinkedInProfileRaw,
  opts: {
    status?: PersonStatus;
    source?: PersonSource;
    nicheId?: string | null;
    linkedinConnectedOn?: Date | null; // from the LinkedIn Connections.csv export, not in the Apify profile
  } = {},
) {
  const currentPos = profile.currentPosition?.[0];

  let companyId: string | undefined;
  if (currentPos?.companyName) {
    const company = await prisma.company.upsert({
      where: {
        linkedinUrl: currentPos.companyLinkedinUrl ?? `__unknown__${currentPos.companyName}`,
      },
      create: {
        name: currentPos.companyName,
        linkedinUrl: currentPos.companyLinkedinUrl ?? null,
        linkedinId: currentPos.companyId ?? null,
        logoUrl: currentPos.companyLogo?.url ?? null,
      },
      update: {
        name: currentPos.companyName,
        logoUrl: currentPos.companyLogo?.url ?? null,
      },
    });
    companyId = company.id;
  }

  const targetStatus = opts.status ?? PersonStatus.RESPONDED;

  // The CSV's connectedOn is only ever a create-time fact — fetch it once so
  // the update branch can fill a missing value without overwriting a real
  // one from an earlier, more trustworthy import (e.g. the first CSV export).
  const existing = opts.linkedinConnectedOn
    ? await prisma.person.findUnique({ where: { linkedinUrl: profile.linkedinUrl }, select: { linkedinConnectedOn: true } })
    : null;

  return prisma.person.upsert({
    where: { linkedinUrl: profile.linkedinUrl },
    create: {
      linkedinId: profile.id,
      linkedinUrl: profile.linkedinUrl,
      publicIdentifier: profile.publicIdentifier,
      firstName: profile.firstName,
      lastName: profile.lastName,
      headline: profile.headline ?? null,
      about: profile.about ?? null,
      photoUrl: profile.photo ?? null,
      location: profile.location?.linkedinText ?? null,
      city: profile.location?.parsed?.city ?? null,
      country: profile.location?.parsed?.country ?? null,
      countryCode: profile.location?.countryCode ?? null,
      jobTitle: currentPos?.position ?? profile.headline ?? null,
      companyId: companyId ?? null,
      nicheId: opts.nicheId ?? null,
      status: targetStatus,
      // Preserves the original single-import behavior: no explicit source
      // left the Prisma schema default (MANUAL_IMPORT) in place. Callers
      // that want APIFY_IMPORT (e.g. the bulk CSV script) pass it explicitly.
      ...(opts.source ? { source: opts.source } : {}),
      ...(opts.linkedinConnectedOn ? { linkedinConnectedOn: opts.linkedinConnectedOn } : {}),
      lastScrapedAt: new Date(),
    },
    update: {
      firstName: profile.firstName,
      lastName: profile.lastName,
      headline: profile.headline ?? null,
      about: profile.about ?? null,
      photoUrl: profile.photo ?? null,
      location: profile.location?.linkedinText ?? null,
      city: profile.location?.parsed?.city ?? null,
      country: profile.location?.parsed?.country ?? null,
      countryCode: profile.location?.countryCode ?? null,
      jobTitle: currentPos?.position ?? profile.headline ?? null,
      companyId: companyId ?? null,
      ...(opts.nicheId !== undefined ? { nicheId: opts.nicheId } : {}),
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.linkedinConnectedOn && !existing?.linkedinConnectedOn ? { linkedinConnectedOn: opts.linkedinConnectedOn } : {}),
      lastScrapedAt: new Date(),
    },
  });
}
