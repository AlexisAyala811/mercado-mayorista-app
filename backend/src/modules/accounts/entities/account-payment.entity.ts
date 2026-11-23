import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'account_payments' })
@Index(
  'uq_account_payments_business_operation',
  ['businessId', 'clientOperationId'],
  { unique: true },
)
@Index('ix_account_payments_account_time', ['accountId', 'createdAt'])
export class AccountPaymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @Column({ name: 'account_id', type: 'uuid' })
  accountId!: string;

  @Column({ name: 'client_operation_id', type: 'uuid' })
  clientOperationId!: string;

  @Column({ name: 'amount_cents', type: 'bigint' })
  amountCents!: string;

  @Column({ default: false, name: 'is_reversal', type: 'boolean' })
  isReversal!: boolean;

  @Column({ name: 'reversed_payment_id', nullable: true, type: 'uuid' })
  reversedPaymentId!: string | null;

  @Column({ length: 240, nullable: true, type: 'varchar' })
  reason!: string | null;

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
