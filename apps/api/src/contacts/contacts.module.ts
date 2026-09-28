import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';
import { ContactImportProcessor, CONTACT_IMPORT_QUEUE } from './contact-import.processor';
import { ApifyService } from './apify.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: CONTACT_IMPORT_QUEUE }),
    PrismaModule,
  ],
  controllers: [ContactsController],
  providers: [ContactsService, ContactImportProcessor, ApifyService],
})
export class ContactsModule {}
