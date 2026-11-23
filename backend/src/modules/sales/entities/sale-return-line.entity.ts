import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'sale_return_lines' })
@Index('uq_sale_return_lines_return_line', ['saleReturnId', 'saleLineId'], { unique: true })
export class SaleReturnLineEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'sale_return_id', type: 'uuid' })
  saleReturnId!: string;

  @Column({ name: 'sale_line_id', type: 'uuid' })
  saleLineId!: string;

  @Column({ name: 'returned_sacks', type: 'integer' })
  returnedSacks!: number;

  @Column({ name: 'returned_weight_kg', precision: 14, scale: 3, type: 'numeric' })
  returnedWeightKg!: string;

  @Column({ name: 'authorized_gross_cents', type: 'bigint' })
  authorizedGrossCents!: string;

  @Column({ name: 'allocated_sale_discount_cents', type: 'bigint' })
  allocatedSaleDiscountCents!: string;

  @Column({ name: 'net_refund_cents', type: 'bigint' })
  netRefundCents!: string;

  @Column({ name: 'gross_cost_reduction_cents', nullable: true, type: 'bigint' })
  grossCostReductionCents!: string | null;

  @Column({ name: 'purchase_discount_reduction_cents', nullable: true, type: 'bigint' })
  purchaseDiscountReductionCents!: string | null;

  @Column({ name: 'net_cost_reduction_cents', nullable: true, type: 'bigint' })
  netCostReductionCents!: string | null;
}
