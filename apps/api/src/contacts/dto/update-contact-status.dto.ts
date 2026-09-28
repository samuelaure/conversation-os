import { IsEnum, IsNotEmpty } from 'class-validator';
import { PersonStatus } from '@prisma/client';

export class UpdateContactStatusDto {
  @IsNotEmpty()
  @IsEnum(PersonStatus)
  status: PersonStatus;
}
