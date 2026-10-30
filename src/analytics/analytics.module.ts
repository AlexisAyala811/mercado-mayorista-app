import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module.js';
import { AnalyticsController } from './analytics.controller.js';
import { AnalyticsService } from './analytics.service.js';
import { EvaluationStore } from './evaluation-store.js';
import { AnalyticsEvaluationService } from './analytics-evaluation.service.js';
import { AnalyticsEvaluationController } from './analytics-evaluation.controller.js';
import { AnalyticsPublicationController } from './analytics-publication.controller.js';
import { AnalyticsPublicationService } from './analytics-publication.service.js';

@Module({
  imports: [IdentityModule],
  controllers: [AnalyticsController, AnalyticsEvaluationController,AnalyticsPublicationController],
  providers: [AnalyticsService, EvaluationStore, AnalyticsEvaluationService,AnalyticsPublicationService],
})
export class AnalyticsModule {}
