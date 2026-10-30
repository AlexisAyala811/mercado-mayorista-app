import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuditModule } from '../audit/audit.module.js';
import { IdentityModule } from '../identity/identity.module.js';
import { ReceptionEntity } from './entities/reception.entity.js';
import { ReceptionSackEntity } from './entities/reception-sack.entity.js';
import { ReceptionController } from './reception.controller.js';
import { ReceptionService } from './reception.service.js';
import { WeighingService } from './weighing.service.js';

@Module({
  controllers: [ReceptionController],
  imports: [
    AuditModule,
    IdentityModule,
    TypeOrmModule.forFeature([ReceptionEntity, ReceptionSackEntity]),
  ],
  providers: [ReceptionService, WeighingService],
})
export class ReceptionModule {}
