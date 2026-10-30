import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AccountKind {
  Payable = 'payable',
  Receivable = 'receivable',
}

export enum AccountState {
  Open = 'open',
  Paid = 'paid',
  Voided = 'voided',
}

@Entity({ name: 'accounts' })
@Index('uq_accounts_source', ['businessId', 'sourceType', 'sourceId'], {
  unique: true,
})
@Index('ix_accounts_business_kind_state', ['businessId', 'kind', 'state'])
export class AccountEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @Column({ enum: AccountKind, enumName: 'account_kind', type: 'enum' })
  kind!: AccountKind;

  @Column({ enum: AccountState, enumName: 'account_state', type: 'enum' })
  state!: AccountState;

  @Column({ length: 80, name: 'source_type', type: 'varchar' })
  sourceType!: string;

  @Column({ name: 'source_id', type: 'uuid' })
  sourceId!: string;

  @Column({ length: 80, name: 'counterparty_type', type: 'varchar' })
  counterpartyType!: string;

  @Column({ name: 'counterparty_id', type: 'uuid' })
  counterpartyId!: string;

  @Column({ name: 'initial_amount_cents', type: 'bigint' })
  initialAmountCents!: string;

  @Column({ name: 'balance_cents', type: 'bigint' })
  balanceCents!: string;

  @Column({ default: 0, type: 'integer' })
  version!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
