import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuditEventEntity } from './audit-event.entity.js';
import { AuditService } from './audit.service.js';
import { AuditController } from './audit.controller.js';
import { IdentityModule } from '../identity/identity.module.js';

@Global()
@Module({
  controllers: [AuditController],
  exports: [AuditService],
  imports: [IdentityModule, TypeOrmModule.forFeature([AuditEventEntity])],
  providers: [AuditService],
})
export class AuditModule {}
