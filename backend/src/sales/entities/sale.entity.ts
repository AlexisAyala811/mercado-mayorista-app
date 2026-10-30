import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import {
  CalculationBasis,
  PaymentMode,
} from '../../purchase/entities/purchase-settlement.entity.js';

export enum SaleState {
  Confirmed = 'confirmed',
  Voided = 'voided',
}

@Entity({ name: 'sales' })
@Index('uq_sales_business_operation', ['businessId', 'clientOperationId'], {
  unique: true,
})
@Index('ix_sales_business_time', ['businessId', 'createdAt'])
export class SaleEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @Column({ name: 'client_operation_id', type: 'uuid' })
  clientOperationId!: string;

  @Column({ name: 'buyer_id', type: 'uuid' })
  buyerId!: string;

  @Column({ length: 160, name: 'destination_department', type: 'varchar' })
  destinationDepartment!: string;

  @Column({ name: 'vehicle_id', nullable: true, type: 'uuid' })
  vehicleId!: string | null;

  @Column({ length: 160, name: 'driver_name', nullable: true, type: 'varchar' })
  driverName!: string | null;

  @Column({ enum: SaleState, enumName: 'sale_state', type: 'enum' })
  state!: SaleState;

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

  @Column({ name: 'freight_amount_cents', type: 'bigint' })
  freightAmountCents!: string;

  @Column({ name: 'freight_included_in_total', type: 'boolean' })
  freightIncludedInTotal!: boolean;

  @Column({ name: 'discounts_cents', type: 'bigint' })
  discountsCents!: string;

  @Column({ name: 'total_amount_cents', type: 'bigint' })
  totalAmountCents!: string;

  @Column({
    enum: PaymentMode,
    enumName: 'payment_mode',
    name: 'payment_mode',
    type: 'enum',
  })
  paymentMode!: PaymentMode;

  @Column({ name: 'void_operation_id', nullable: true, type: 'uuid' })
  voidOperationId!: string | null;

  @Column({ default: 0, type: 'integer' })
  version!: number;

  @Column({ name: 'voided_at', nullable: true, type: 'timestamptz' })
  voidedAt!: Date | null;

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
