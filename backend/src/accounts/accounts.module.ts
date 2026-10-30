import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuditModule } from '../audit/audit.module.js';
import { IdentityModule } from '../identity/identity.module.js';
import { AccountEntity } from './entities/account.entity.js';
import { AccountInstallmentEntity } from './entities/account-installment.entity.js';
import { AccountPaymentAllocationEntity } from './entities/account-payment-allocation.entity.js';
import { AccountPaymentEntity } from './entities/account-payment.entity.js';
import { CashMovementEntity } from './entities/cash-movement.entity.js';
import { AccountsController } from './accounts.controller.js';
import { AccountsService } from './accounts.service.js';

@Module({
  controllers: [AccountsController],
  imports: [
    AuditModule,
    IdentityModule,
    TypeOrmModule.forFeature([
      AccountEntity,
      AccountInstallmentEntity,
      AccountPaymentEntity,
      AccountPaymentAllocationEntity,
      CashMovementEntity,
    ]),
  ],
  providers: [AccountsService],
})
export class AccountsModule {}
