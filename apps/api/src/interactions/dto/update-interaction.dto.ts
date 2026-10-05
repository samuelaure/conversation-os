import { IsEnum, IsOptional, IsString } from 'class-validator';
import { InteractionStatus } from '@prisma/client';

export class UpdateInteractionDto {
  @IsOptional()
  @IsEnum(InteractionStatus)
  status?: InteractionStatus;

  @IsOptional()
  @IsString()
  editedMessage?: string;

  @IsOptional()
  @IsString()
  finalMessage?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
