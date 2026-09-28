import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PersonStatus } from '@prisma/client';
import { ApifyService, LinkedInProfileRaw } from './apify.service';
import { PrismaService } from '../prisma/prisma.service';

export const CONTACT_IMPORT_QUEUE = 'contact-import';
export const IMPORT_JOB = 'import';

@Processor(CONTACT_IMPORT_QUEUE)
export class ContactImportProcessor {
  private readonly logger = new Logger(ContactImportProcessor.name);

  constructor(
    private readonly apify: ApifyService,
    private readonly prisma: PrismaService,
  ) {}

  @Process(IMPORT_JOB)
  async handleImport(job: Job<{ linkedinUrl: string; status?: PersonStatus }>) {
    try {
      const { linkedinUrl, status } = job.data;
      this.logger.log(`Starting import for: ${linkedinUrl} with status: ${status ?? 'RESPONDED (default)'}`);

      await job.progress(10);

      const profile = await this.apify.scrapeLinkedInProfile(linkedinUrl);

      if (!profile) {
        this.logger.warn(`Apify returned no data for: ${linkedinUrl}`);
        throw new Error(`No profile data returned for ${linkedinUrl}`);
      }

      await job.progress(60);

      const result = await this.upsertContact(profile, status);

      await job.progress(100);
      this.logger.log(`Import complete: ${result.firstName} ${result.lastName} (${result.id})`);

      return { personId: result.id };
    } catch (error) {
      this.logger.error(`Import failed for job ${job.id}: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }

  private async upsertContact(profile: LinkedInProfileRaw, status?: PersonStatus) {
    const currentPos = profile.currentPosition?.[0];

    // Upsert company first if we have one
    let companyId: string | undefined;
    if (currentPos?.companyName) {
      const company = await this.prisma.company.upsert({
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

    const targetStatus = status ?? PersonStatus.RESPONDED;

    // Upsert person
    const person = await this.prisma.person.upsert({
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
        status: targetStatus,
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
        ...(status ? { status } : {}),
        lastScrapedAt: new Date(),
      },
    });

    return person;
  }
}

