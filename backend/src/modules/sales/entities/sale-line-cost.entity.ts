import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'sale_line_costs' })
@Index('uq_sale_line_costs_line', ['saleLineId'], { unique: true })
@Index('ix_sale_line_costs_business_sale', ['businessId', 'saleId'])
export class SaleLineCostEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @Column({ name: 'sale_id', type: 'uuid' })
  saleId!: string;

  @Column({ name: 'sale_line_id', type: 'uuid' })
  saleLineId!: string;

  @Column({ name: 'lot_id', type: 'uuid' })
  lotId!: string;

  @Column({ name: 'is_determinable', type: 'boolean' })
  isDeterminable!: boolean;

  @Column({ name: 'gross_cost_cents', nullable: true, type: 'bigint' })
  grossCostCents!: string | null;

  @Column({ name: 'allocated_purchase_discount_cents', nullable: true, type: 'bigint' })
  allocatedPurchaseDiscountCents!: string | null;

  @Column({ name: 'net_cost_cents', nullable: true, type: 'bigint' })
  netCostCents!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
