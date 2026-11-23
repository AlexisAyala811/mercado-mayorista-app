import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'sale_returns' })
@Index('uq_sale_returns_business_operation', ['businessId', 'clientOperationId'], { unique: true })
@Index('ix_sale_returns_business_sale_time', ['businessId', 'saleId', 'createdAt'])
export class SaleReturnEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @Column({ name: 'sale_id', type: 'uuid' })
  saleId!: string;

  @Column({ name: 'client_operation_id', type: 'uuid' })
  clientOperationId!: string;

  @Column({ length: 240, type: 'varchar' })
  reason!: string;

  @Column({ name: 'merchandise_gross_cents', type: 'bigint' })
  merchandiseGrossCents!: string;

  @Column({ name: 'allocated_sale_discount_cents', type: 'bigint' })
  allocatedSaleDiscountCents!: string;

  @Column({ name: 'net_merchandise_refund_cents', type: 'bigint' })
  netMerchandiseRefundCents!: string;

  @Column({ name: 'freight_adjustment_cents', type: 'bigint' })
  freightAdjustmentCents!: string;

  @Column({ name: 'total_refund_cents', type: 'bigint' })
  totalRefundCents!: string;

  @Column({ name: 'account_credit_cents', type: 'bigint' })
  accountCreditCents!: string;

  @Column({ name: 'cash_refund_cents', type: 'bigint' })
  cashRefundCents!: string;

  @Column({ name: 'sale_version_before', type: 'integer' })
  saleVersionBefore!: number;

  @Column({ name: 'sale_version_after', type: 'integer' })
  saleVersionAfter!: number;

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
