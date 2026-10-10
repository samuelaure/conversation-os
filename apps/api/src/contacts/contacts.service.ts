import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PersonStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CONTACT_IMPORT_QUEUE, IMPORT_JOB } from './contact-import.processor';

@Injectable()
export class ContactsService {
  constructor(
    @InjectQueue(CONTACT_IMPORT_QUEUE) private importQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  async enqueueImport(linkedinUrl: string, status?: PersonStatus) {
    const job = await this.importQueue.add(
      IMPORT_JOB,
      { linkedinUrl, status },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: false,
        removeOnFail: false,
      },
    );

    return { jobId: job.id, status: 'queued', linkedinUrl, contactStatus: status };
  }

  async getJobStatus(jobId: string) {
    const job = await this.importQueue.getJob(jobId);
    if (!job) return null;

    const state = await job.getState();
    const progress = job.progress();

    return {
      jobId: job.id,
      state,
      progress,
      result: job.returnvalue ?? null,
      failedReason: job.failedReason ?? null,
    };
  }

  /**
   * Excludes ACCOUNT_DELETED by default — LinkedIn's CSV export only gives a
   * connection date for a closed/restricted account (no name, no profile),
   * so they're kept as rows (connectionCount() below counts them, to match
   * LinkedIn's own total) but have nothing actionable and would otherwise
   * clutter every working list. Pass includeDeleted to see them anyway.
   */
  async findAll(includeDeleted = false) {
    return this.prisma.person.findMany({
      where: includeDeleted ? {} : { status: { not: PersonStatus.ACCOUNT_DELETED } },
      include: { company: true, niche: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Total connection count including ACCOUNT_DELETED, to match LinkedIn's own count. */
  async connectionCount() {
    return this.prisma.person.count();
  }

  async findOne(id: string) {
    return this.prisma.person.findUnique({
      where: { id },
      include: { company: true, niche: true },
    });
  }

  async updateStatus(id: string, status: PersonStatus) {
    const person = await this.prisma.person.findUnique({ where: { id } });
    if (!person) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }

    return this.prisma.person.update({
      where: { id },
      data: { status },
      include: { company: true, niche: true },
    });
  }

  async updateNiche(id: string, nicheSlug: string | null) {
    const person = await this.prisma.person.findUnique({ where: { id } });
    if (!person) throw new NotFoundException(`Contact with ID ${id} not found`);

    let nicheId: string | null = null;
    if (nicheSlug) {
      const niche = await this.prisma.niche.findUnique({ where: { slug: nicheSlug } });
      if (!niche) throw new NotFoundException(`Niche "${nicheSlug}" not found`);
      nicheId = niche.id;
    }

    return this.prisma.person.update({
      where: { id },
      data: { nicheId },
      include: { company: true, niche: true },
    });
  }

  async getNiches() {
    return this.prisma.niche.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  }

  /**
   * Updates the person's sub-niche label (market / competitor / partner / reference).
   * Stored as "label:X" in the existing tags array. Other tags are preserved.
   */
  async updateLabel(id: string, label: string | null) {
    const person = await this.prisma.person.findUnique({ where: { id } });
    if (!person) throw new NotFoundException(`Contact with ID ${id} not found`);

    const VALID = ['market', 'competitor', 'partner', 'reference'];
    if (label && !VALID.includes(label)) {
      throw new Error(`Invalid label "${label}". Valid: ${VALID.join(', ')}`);
    }

    const otherTags = (person.tags as string[]).filter((t: string) => !t.startsWith('label:'));
    const newTags   = label ? [...otherTags, `label:${label}`] : otherTags;

    return this.prisma.person.update({
      where: { id },
      data: { tags: newTags },
      include: { company: true, niche: true },
    });
  }
}
