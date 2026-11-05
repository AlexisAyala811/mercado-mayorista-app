import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

import { CalculationBasis } from './purchase-settlement.entity.js';

// One lot of a purchase settlement (spec 010): the active sacks of one variety
// and quality, priced with their own basis. Sacks, weight and amount are the
// facts computed by the server when the purchase was settled.
@Entity({ name: 'purchase_settlement_lots' })
@Index('ix_purchase_settlement_lots_business', ['businessId', 'settlementId'])
export class PurchaseSettlementLotEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @Column({ name: 'settlement_id', type: 'uuid' })
  settlementId!: string;

  @Column({ length: 2, type: 'varchar' })
  letter!: string;

  @Column({ length: 60, nullable: true, type: 'varchar' })
  name!: string | null;

  @Column({ name: 'variety_id', type: 'uuid' })
  varietyId!: string;

  @Column({ name: 'quality_id', nullable: true, type: 'uuid' })
  qualityId!: string | null;

  @Column({
    length: 120,
    name: 'quality_name',
    nullable: true,
    type: 'varchar',
  })
  qualityName!: string | null;

  @Column({
    enum: CalculationBasis,
    enumName: 'calculation_basis',
    name: 'price_basis',
    type: 'enum',
  })
  priceBasis!: CalculationBasis;

  @Column({ name: 'unit_price_cents', type: 'bigint' })
  unitPriceCents!: string;

  @Column({ type: 'integer' })
  sacks!: number;

  @Column({ name: 'net_weight_kg', precision: 14, scale: 3, type: 'numeric' })
  netWeightKg!: string;

  @Column({ name: 'amount_cents', type: 'bigint' })
  amountCents!: string;
}
