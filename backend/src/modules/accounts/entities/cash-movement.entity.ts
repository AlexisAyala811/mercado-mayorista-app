import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum CashDirection {
  In = 'in',
  Out = 'out',
}

@Entity({ name: 'cash_movements' })
@Index(
  'uq_cash_movements_business_category_operation',
  ['businessId', 'category', 'clientOperationId'],
  { unique: true },
)
@Index('ix_cash_movements_business_time', ['businessId', 'createdAt'])
export class CashMovementEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @Column({ name: 'client_operation_id', type: 'uuid' })
  clientOperationId!: string;

  @Column({ enum: CashDirection, enumName: 'cash_direction', type: 'enum' })
  direction!: CashDirection;

  @Column({ length: 80, type: 'varchar' })
  category!: string;

  @Column({ name: 'amount_cents', type: 'bigint' })
  amountCents!: string;

  @Column({ length: 80, name: 'source_type', type: 'varchar' })
  sourceType!: string;

  @Column({ name: 'source_id', type: 'uuid' })
  sourceId!: string;

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
