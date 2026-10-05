import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { InteractionType, InteractionDirection, InteractionStatus } from '@prisma/client';

export class CreateInteractionDto {
  @IsString()
  personId: string;

  @IsEnum(InteractionType)
  type: InteractionType;

  @IsEnum(InteractionDirection)
  direction: InteractionDirection;

  @IsOptional()
  @IsString()
  proposedMessage?: string;

  @IsOptional()
  @IsEnum(InteractionStatus)
  status?: InteractionStatus;

  @IsOptional()
  @IsDateString()
  scheduledFor?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
