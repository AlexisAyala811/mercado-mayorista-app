import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'freight_settlements' })
@Index(
  'uq_freight_settlements_business_operation',
  ['businessId', 'clientOperationId'],
  { unique: true },
)
export class FreightSettlementEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @Column({ name: 'client_operation_id', type: 'uuid' })
  clientOperationId!: string;

  @Column({ name: 'settled_on', type: 'date' })
  settledOn!: string;

  @Column({ name: 'total_amount_cents', type: 'bigint' })
  totalAmountCents!: string;

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
