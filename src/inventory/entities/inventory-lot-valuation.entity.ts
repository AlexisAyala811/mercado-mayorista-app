import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

import { CalculationBasis } from '../../purchase/entities/purchase-settlement.entity.js';

@Entity({ name: 'inventory_lot_valuations' })
@Index('uq_inventory_lot_valuations_lot', ['lotId'], { unique: true })
@Index('ix_inventory_lot_valuations_business_purchase', [
  'businessId',
  'purchaseSettlementId',
])
export class InventoryLotValuationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @Column({ name: 'lot_id', type: 'uuid' })
  lotId!: string;

  @Column({ name: 'purchase_settlement_id', type: 'uuid' })
  purchaseSettlementId!: string;

  @Column({ enum: CalculationBasis, enumName: 'calculation_basis', name: 'price_basis', type: 'enum' })
  priceBasis!: CalculationBasis;

  @Column({ name: 'unit_price_cents', type: 'bigint' })
  unitPriceCents!: string;

  @Column({ name: 'gross_cost_cents', type: 'bigint' })
  grossCostCents!: string;

  @Column({ name: 'allocated_discount_cents', type: 'bigint' })
  allocatedDiscountCents!: string;

  @Column({ name: 'net_cost_cents', type: 'bigint' })
  netCostCents!: string;

  @Column({ name: 'initial_sacks', type: 'integer' })
  initialSacks!: number;

  @Column({ name: 'initial_weight_kg', precision: 14, scale: 3, type: 'numeric' })
  initialWeightKg!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
