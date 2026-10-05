import { Module } from '@nestjs/common';
import { InteractionsController } from './interactions.controller';
import { InteractionsService } from './interactions.service';
import { MessageGeneratorService } from './message-generator.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [InteractionsController],
  providers: [InteractionsService, MessageGeneratorService],
  exports: [InteractionsService, MessageGeneratorService],
})
export class InteractionsModule {}
