import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { AuditModule } from '../audit/audit.module.js';
import { AuditService } from '../audit/audit.service.js';
import { IdentityModule } from '../identity/identity.module.js';
import { RegisterSackWeight } from './application/register-sack-weight.js';
import { ReceptionEntity } from './entities/reception.entity.js';
import { ReceptionSackEntity } from './entities/reception-sack.entity.js';
import { ReceptionController } from './reception.controller.js';
import { ReceptionService } from './reception.service.js';
import { PostgresWeighingUnitOfWork } from './infrastructure/postgres-weighing.js';
import { WeighingService } from './weighing.service.js';

@Module({
  controllers: [ReceptionController],
  imports: [
    AuditModule,
    IdentityModule,
    TypeOrmModule.forFeature([ReceptionEntity, ReceptionSackEntity]),
  ],
  providers: [
    ReceptionService,
    WeighingService,
    {
      // Composition root: the use case receives the PostgreSQL unit of work.
      provide: RegisterSackWeight,
      useFactory: (dataSource: DataSource, audit: AuditService) =>
        new RegisterSackWeight(
          new PostgresWeighingUnitOfWork(dataSource, audit),
        ),
      inject: [DataSource, AuditService],
    },
  ],
})
export class ReceptionModule {}
