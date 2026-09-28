import { IsUrl, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { PersonStatus } from '@prisma/client';

export class ImportContactDto {
  @IsUrl({}, { message: 'Must be a valid URL' })
  @IsNotEmpty()
  linkedinUrl: string;

  @IsOptional()
  @IsEnum(PersonStatus)
  status?: PersonStatus;
}

