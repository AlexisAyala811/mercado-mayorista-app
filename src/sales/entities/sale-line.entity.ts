import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

import { CalculationBasis } from '../../purchase/entities/purchase-settlement.entity.js';

@Entity({ name: 'sale_lines' })
@Index('uq_sale_lines_sale_lot', ['saleId', 'lotId'], { unique: true })
// The partial NULLS NOT DISTINCT index is managed by migration 025.
export class SaleLineEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'sale_id', type: 'uuid' })
  saleId!: string;

  @Column({ name: 'variety_id', type: 'uuid' })
  varietyId!: string;

  @Column({name:'quality_id',type:'uuid',nullable:true}) qualityId!:string|null;
  @Column({name:'quality_name',type:'varchar',length:120,nullable:true}) qualityName!:string|null;
  @Column({name:'origin_id',type:'uuid',nullable:true}) originId!:string|null;
  @Column({name:'origin_name',type:'varchar',length:120,nullable:true}) originName!:string|null;

  @Column({ name: 'lot_id', type: 'uuid', nullable: true })
  lotId!: string | null;

  @Column({ type: 'integer' })
  sacks!: number;

  @Column({ name: 'weight_kg', precision: 14, scale: 3, type: 'numeric' })
  weightKg!: string;

  @Column({
    enum: CalculationBasis,
    enumName: 'calculation_basis',
    name: 'price_basis',
    type: 'enum',
  })
  priceBasis!: CalculationBasis;

  @Column({ name: 'unit_price_cents', type: 'bigint' })
  unitPriceCents!: string;

  @Column({ name: 'subtotal_cents', type: 'bigint' })
  subtotalCents!: string;

  @Column({ name: 'lot_version', type: 'integer', nullable: true })
  lotVersion!: number | null;
}
