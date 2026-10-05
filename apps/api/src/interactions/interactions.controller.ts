import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { InteractionsService } from './interactions.service';
import { CreateInteractionDto } from './dto/create-interaction.dto';
import { UpdateInteractionDto } from './dto/update-interaction.dto';

@Controller('interactions')
export class InteractionsController {
  constructor(private readonly svc: InteractionsService) {}

  /**
   * GET /api/interactions/queue
   * Returns the daily action queue (3 priority groups).
   */
  @Get('queue')
  async getQueue() {
    return this.svc.getActionQueue();
  }

  /**
   * GET /api/interactions/generate?personId=X&type=RESEARCH_PITCH
   * Generates a proposed message for a contact without persisting it.
   */
  @Get('generate')
  async generate(@Query('personId') personId: string, @Query('type') type: string) {
    return this.svc.generateMessage(personId, type);
  }

  /**
   * GET /api/interactions/person/:personId
   * Returns all interactions for a specific contact.
   */
  @Get('person/:personId')
  async findByPerson(@Param('personId') personId: string) {
    return this.svc.findByPerson(personId);
  }

  /**
   * POST /api/interactions
   * Logs a new interaction (e.g. an inbound response, or saving a draft).
   */
  @Post()
  async create(@Body() dto: CreateInteractionDto) {
    return this.svc.create(dto);
  }

  /**
   * PATCH /api/interactions/:id
   * Marks an interaction as sent (with or without edits), received, or skipped.
   */
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateInteractionDto) {
    return this.svc.update(id, dto);
  }
}
