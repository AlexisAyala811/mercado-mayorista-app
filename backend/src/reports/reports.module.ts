import { Module } from '@nestjs/common';

import { IdentityModule } from '../identity/identity.module.js';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';

@Module({
  controllers: [ReportsController],
  imports: [IdentityModule],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
