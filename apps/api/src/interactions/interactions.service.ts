import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MessageGeneratorService } from './message-generator.service';
import { CreateInteractionDto } from './dto/create-interaction.dto';
import { UpdateInteractionDto } from './dto/update-interaction.dto';
import { InteractionStatus, InteractionType, PersonStatus } from '@prisma/client';

// How many days before a follow-up is "due"
const FOLLOW_UP_DAYS: Record<string, number> = {
  INITIAL_CONTACT: 4,   // 4 days after sending initial contact → follow up 1
  FOLLOW_UP: 5,         // 5 days after follow up 1 → follow up 2
  RESEARCH_PITCH: 3,    // 3 days after pitch → pitch follow up
  RESEARCH_FOLLOW_UP: 4,
};

@Injectable()
export class InteractionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly generator: MessageGeneratorService,
  ) {}

  /* ── List all interactions for a person ─────────────────── */
  async findByPerson(personId: string) {
    return this.prisma.interaction.findMany({
      where: { personId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /* ── Create interaction (manual log or AI draft) ────────── */
  async create(dto: CreateInteractionDto) {
    return this.prisma.interaction.create({ data: dto });
  }

  /* ── Update interaction (mark sent / add edited message) ── */
  async update(id: string, dto: UpdateInteractionDto) {
    const ix = await this.prisma.interaction.findUnique({ where: { id } });
    if (!ix) throw new NotFoundException(`Interaction ${id} not found`);

    const data: Record<string, unknown> = { ...dto };

    // Determine final message
    if (dto.status === InteractionStatus.SENT) {
      data.finalMessage = ix.proposedMessage;
      data.sentAt       = new Date();
    }
    if (dto.status === InteractionStatus.SENT_EDITED) {
      data.finalMessage = dto.editedMessage ?? ix.editedMessage ?? ix.proposedMessage;
      data.sentAt       = new Date();
    }

    const updated = await this.prisma.interaction.update({ where: { id }, data });

    // Side-effects: update Person tracking fields when a message is sent
    if (dto.status === InteractionStatus.SENT || dto.status === InteractionStatus.SENT_EDITED) {
      await this.onMessageSent(updated.personId, updated.type as string);
    }
    if (dto.status === InteractionStatus.RECEIVED) {
      await this.prisma.person.update({
        where: { id: updated.personId },
        data: { lastRespondedAt: new Date() },
      });
    }

    return updated;
  }

  /* ── When a message is sent: update lastContactedAt & nextFollowUpAt ── */
  private async onMessageSent(personId: string, type: string) {
    const now      = new Date();
    const days     = FOLLOW_UP_DAYS[type] ?? null;
    const nextDate = days ? new Date(now.getTime() + days * 86_400_000) : null;

    const person = await this.prisma.person.findUnique({ where: { id: personId } });
    if (!person) return;

    await this.prisma.person.update({
      where: { id: personId },
      data: {
        lastContactedAt: now,
        nextFollowUpAt: nextDate,
        followUpCount: type === 'FOLLOW_UP' || type === 'RESEARCH_FOLLOW_UP'
          ? { increment: 1 }
          : person.followUpCount,
        // Auto-advance status for key types
        ...(type === 'INITIAL_CONTACT' && person.status === PersonStatus.CONNECTED
          ? { status: PersonStatus.INITIAL_MESSAGE_SENT }
          : {}),
        ...(type === 'RESEARCH_PITCH' && person.status === PersonStatus.RESPONDED
          ? { status: PersonStatus.RESEARCH_INVITED }
          : {}),
      },
    });
  }

  /* ── Generate a proposed message for a person + type ────── */
  async generateMessage(personId: string, type: string) {
    const person = await this.prisma.person.findUnique({
      where: { id: personId },
      include: { niche: true },
    });
    if (!person) throw new NotFoundException(`Person ${personId} not found`);

    let openQuestions: Array<{ order: number; question: string; context: string | null }> = [];

    if (type === 'RESEARCH_INTERVIEW' && person.nicheId) {
      const plan = await this.prisma.researchPlan.findUnique({
        where: { nicheId: person.nicheId },
        include: {
          questions: {
            where: { status: 'OPEN' },
            orderBy: { order: 'asc' },
            take: 5,
          },
        },
      });
      openQuestions = plan?.questions ?? [];
    }

    const message = this.generator.generate(type, person, { openQuestions });

    return { personId, type, proposedMessage: message };
  }

  /* ── Daily action queues ─────────────────────────────────── */
  /**
   * Returns contacts that need action TODAY, grouped by queue type.
   * Priority 1: RESPONDED → ready for research pitch
   * Priority 2: Follow-ups due (nextFollowUpAt <= now)
   * Priority 3: INITIAL_MESSAGE_SENT with no followup yet (>4 days since import)
   */
  async getActionQueue() {
    const now = new Date();

    // Queue 1: Responded → pitch them
    const respondedContacts = await this.prisma.person.findMany({
      where: {
        status: PersonStatus.RESPONDED,
        // Exclude those already invited
      },
      include: { company: true, niche: true },
      orderBy: { lastRespondedAt: 'asc' },
    });

    // Queue 2: Follow-ups due (have a nextFollowUpAt in the past)
    const followUpsDue = await this.prisma.person.findMany({
      where: {
        nextFollowUpAt: { lte: now },
        status: {
          in: [
            PersonStatus.INITIAL_MESSAGE_SENT,
            PersonStatus.RESEARCH_INVITED,
          ],
        },
      },
      include: { company: true, niche: true },
      orderBy: { nextFollowUpAt: 'asc' },
    });

    // Queue 3: Connected but no initial message and imported >2 days ago
    const twoDaysAgo = new Date(now.getTime() - 2 * 86_400_000);
    const neverContacted = await this.prisma.person.findMany({
      where: {
        status: PersonStatus.CONNECTED,
        lastContactedAt: null,
        importedAt: { lte: twoDaysAgo },
      },
      include: { company: true, niche: true },
      orderBy: { importedAt: 'asc' },
    });

    return {
      pitchReady:     respondedContacts,
      followUpsDue:   followUpsDue,
      neverContacted: neverContacted,
      total: respondedContacts.length + followUpsDue.length + neverContacted.length,
    };
  }
}
