import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { CalculationBasis } from '../../purchase/entities/purchase-settlement.entity.js';

export enum FreightOperationType {
  Purchase = 'purchase',
  Sale = 'sale',
}

export enum FreightEntryState {
  Pending = 'pending',
  Settled = 'settled',
  Voided = 'voided',
}

@Entity({ name: 'freight_entries' })
@Index(
  'uq_freight_entries_source',
  ['businessId', 'operationType', 'operationId'],
  { unique: true },
)
@Index('ix_freight_entries_business_state', [
  'businessId',
  'state',
  'createdAt',
])
export class FreightEntryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @Column({
    enum: FreightOperationType,
    enumName: 'freight_operation_type',
    name: 'operation_type',
    type: 'enum',
  })
  operationType!: FreightOperationType;

  @Column({ name: 'operation_id', type: 'uuid' })
  operationId!: string;

  @Column({ name: 'carrier_id', nullable: true, type: 'uuid' })
  carrierId!: string | null;

  @Column({
    enum: CalculationBasis,
    enumName: 'calculation_basis',
    type: 'enum',
  })
  basis!: CalculationBasis;

  @Column({ name: 'rate_cents', type: 'bigint' })
  rateCents!: string;

  @Column({ name: 'derived_sacks', type: 'integer' })
  derivedSacks!: number;

  @Column({
    name: 'derived_weight_kg',
    precision: 14,
    scale: 3,
    type: 'numeric',
  })
  derivedWeightKg!: string;

  @Column({ name: 'amount_cents', type: 'bigint' })
  amountCents!: string;

  @Column({
    enum: FreightEntryState,
    enumName: 'freight_entry_state',
    type: 'enum',
  })
  state!: FreightEntryState;

  @Column({ name: 'settlement_id', nullable: true, type: 'uuid' })
  settlementId!: string | null;

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
