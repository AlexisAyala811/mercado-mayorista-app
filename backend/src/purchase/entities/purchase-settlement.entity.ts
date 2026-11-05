import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum CalculationBasis {
  Kilogram = 'kilogram',
  Sack = 'sack',
}

export enum PaymentMode {
  Cash = 'cash',
  Credit = 'credit',
}

// Who bears the freight of a purchase (spec 010): the provider has it deducted
// from the liquid amount; the wholesaler only owes it to the carrier.
export enum FreightChargeParty {
  Provider = 'provider',
  Wholesaler = 'wholesaler',
}

export enum PurchaseSettlementState {
  Confirmed = 'confirmed',
  Voided = 'voided',
}

@Entity({ name: 'purchase_settlements' })
@Index(
  'uq_purchase_settlements_business_operation',
  ['businessId', 'clientOperationId'],
  { unique: true },
)
@Index('uq_purchase_settlements_reception', ['receptionId'], { unique: true })
export class PurchaseSettlementEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @Column({ name: 'reception_id', type: 'uuid' })
  receptionId!: string;

  @Column({ name: 'client_operation_id', type: 'uuid' })
  clientOperationId!: string;

  @Column({
    enum: CalculationBasis,
    enumName: 'calculation_basis',
    name: 'price_basis',
    nullable: true,
    type: 'enum',
  })
  // Single price of settlements without lots; null when the settlement has lots.
  priceBasis!: CalculationBasis | null;

  @Column({ name: 'unit_price_cents', nullable: true, type: 'bigint' })
  unitPriceCents!: string | null;

  @Column({ name: 'gross_amount_cents', type: 'bigint' })
  grossAmountCents!: string;

  @Column({
    enum: CalculationBasis,
    enumName: 'calculation_basis',
    name: 'freight_basis',
    nullable: true,
    type: 'enum',
  })
  freightBasis!: CalculationBasis | null;

  @Column({ name: 'freight_rate_cents', nullable: true, type: 'bigint' })
  freightRateCents!: string | null;

  @Column({
    default: FreightChargeParty.Provider,
    enum: FreightChargeParty,
    enumName: 'freight_charge_party',
    name: 'freight_charged_to',
    type: 'enum',
  })
  freightChargedTo!: FreightChargeParty;

  @Column({ name: 'freight_amount_cents', type: 'bigint' })
  freightAmountCents!: string;

  @Column({ name: 'advances_cents', type: 'bigint' })
  advancesCents!: string;

  @Column({ name: 'discounts_cents', type: 'bigint' })
  discountsCents!: string;

  @Column({ name: 'liquid_amount_cents', type: 'bigint' })
  liquidAmountCents!: string;

  @Column({
    enum: PaymentMode,
    enumName: 'payment_mode',
    name: 'payment_mode',
    type: 'enum',
  })
  paymentMode!: PaymentMode;

  @Column({
    enum: PurchaseSettlementState,
    enumName: 'purchase_settlement_state',
    type: 'enum',
  })
  state!: PurchaseSettlementState;

  @Column({ default: 0, type: 'integer' })
  version!: number;

  @Column({ name: 'void_operation_id', nullable: true, type: 'uuid' })
  voidOperationId!: string | null;

  @Column({ length: 240, name: 'void_reason', nullable: true, type: 'varchar' })
  voidReason!: string | null;

  @Column({ name: 'voided_at', nullable: true, type: 'timestamptz' })
  voidedAt!: Date | null;

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
