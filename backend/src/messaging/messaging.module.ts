import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdentityModule } from '../identity/identity.module.js';
import { ReportsModule } from '../reports/reports.module.js';
import { MessagingController } from './messaging.controller.js';
import { MessagingService } from './messaging.service.js';
import { ShareAttemptEntity } from './share-attempt.entity.js';

@Module({ imports: [IdentityModule, ReportsModule, TypeOrmModule.forFeature([ShareAttemptEntity])], controllers: [MessagingController], providers: [MessagingService] })
export class MessagingModule {}
