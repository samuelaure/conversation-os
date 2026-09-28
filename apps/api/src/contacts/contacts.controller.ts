import { Controller, Post, Get, Patch, Body, Param } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { ImportContactDto } from './dto/import-contact.dto';
import { UpdateContactStatusDto } from './dto/update-contact-status.dto';

@Controller('contacts')
export class ContactsController {
  constructor(private readonly contacts: ContactsService) {}

  /** POST /api/contacts/import — Enqueues a LinkedIn profile scrape job */
  @Post('import')
  async import(@Body() dto: ImportContactDto) {
    return this.contacts.enqueueImport(dto.linkedinUrl, dto.status);
  }

  /** GET /api/contacts/jobs/:jobId — Polls job status */
  @Get('jobs/:jobId')
  async jobStatus(@Param('jobId') jobId: string) {
    return this.contacts.getJobStatus(jobId);
  }

  /** GET /api/contacts — Returns all contacts */
  @Get()
  async findAll() {
    return this.contacts.findAll();
  }

  /**
   * GET /api/contacts/niches
   * Must be declared BEFORE /:id to avoid routing conflict.
   */
  @Get('niches')
  async getNiches() {
    return this.contacts.getNiches();
  }

  /** GET /api/contacts/:id */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.contacts.findOne(id);
  }

  /** PATCH /api/contacts/:id — Updates status */
  @Patch(':id')
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateContactStatusDto) {
    return this.contacts.updateStatus(id, dto.status);
  }

  /** PATCH /api/contacts/:id/niche — Assigns niche by slug */
  @Patch(':id/niche')
  async updateNiche(@Param('id') id: string, @Body() body: { nicheSlug: string | null }) {
    return this.contacts.updateNiche(id, body.nicheSlug);
  }

  /**
   * PATCH /api/contacts/:id/label
   * Sets sub-niche label: market | competitor | partner | reference | null
   */
  @Patch(':id/label')
  async updateLabel(@Param('id') id: string, @Body() body: { label: string | null }) {
    return this.contacts.updateLabel(id, body.label);
  }
}
