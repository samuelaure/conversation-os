import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PersonStatus } from '@prisma/client';
import { ApifyService } from './apify.service';
import { PrismaService } from '../prisma/prisma.service';
import { upsertContactFromApifyProfile } from './contact-upsert.util';

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

      const result = await upsertContactFromApifyProfile(this.prisma, profile, { status });

      await job.progress(100);
      this.logger.log(`Import complete: ${result.firstName} ${result.lastName} (${result.id})`);

      return { personId: result.id };
    } catch (error) {
      this.logger.error(`Import failed for job ${job.id}: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }
}

