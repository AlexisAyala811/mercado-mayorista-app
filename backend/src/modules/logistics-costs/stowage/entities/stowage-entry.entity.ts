import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum StowageOperationType {
  Purchase = 'purchase',
  Sale = 'sale',
}

export enum StowageActivity {
  Load = 'load',
  Unload = 'unload',
}

export enum StowageEntryState {
  Pending = 'pending',
  Settled = 'settled',
}

@Entity({ name: 'stowage_entries' })
@Index(
  'uq_stowage_entries_business_operation',
  ['businessId', 'clientOperationId'],
  { unique: true },
)
@Index('ix_stowage_entries_business_state_date', [
  'businessId',
  'state',
  'occurredOn',
])
export class StowageEntryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @Column({ name: 'client_operation_id', type: 'uuid' })
  clientOperationId!: string;

  @Column({ name: 'work_group_id', type: 'uuid' })
  workGroupId!: string;

  @Column({
    enum: StowageOperationType,
    enumName: 'stowage_operation_type',
    name: 'operation_type',
    type: 'enum',
  })
  operationType!: StowageOperationType;

  @Column({ name: 'operation_id', type: 'uuid' })
  operationId!: string;

  @Column({ enum: StowageActivity, enumName: 'stowage_activity', type: 'enum' })
  activity!: StowageActivity;

  @Column({ name: 'amount_cents', type: 'bigint' })
  amountCents!: string;

  @Column({ name: 'occurred_on', type: 'date' })
  occurredOn!: string;

  @Column({
    enum: StowageEntryState,
    enumName: 'stowage_entry_state',
    type: 'enum',
  })
  state!: StowageEntryState;

  @Column({ name: 'settlement_id', nullable: true, type: 'uuid' })
  settlementId!: string | null;

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
