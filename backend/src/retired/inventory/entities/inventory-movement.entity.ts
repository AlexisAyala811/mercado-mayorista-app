import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum InventoryMovementType {
  PurchaseIn = 'purchase_in',
  SaleOut = 'sale_out',
  ReturnIn = 'return_in',
  LossOut = 'loss_out',
  Adjustment = 'adjustment',
  Reversal = 'reversal',
}

@Entity({ name: 'inventory_movements' })
@Index(
  'uq_inventory_movements_operation_lot_type',
  ['businessId', 'clientOperationId', 'lotId', 'type'],
  { unique: true },
)
@Index('ix_inventory_movements_lot_time', ['lotId', 'createdAt'])
export class InventoryMovementEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @Column({ name: 'lot_id', type: 'uuid' })
  lotId!: string;

  @Column({ name: 'client_operation_id', type: 'uuid' })
  clientOperationId!: string;

  @Column({
    enum: InventoryMovementType,
    enumName: 'inventory_movement_type',
    type: 'enum',
  })
  type!: InventoryMovementType;

  @Column({ name: 'sack_delta', type: 'integer' })
  sackDelta!: number;

  @Column({ name: 'weight_delta_kg', precision: 14, scale: 3, type: 'numeric' })
  weightDeltaKg!: string;

  @Column({ length: 80, name: 'source_type', type: 'varchar' })
  sourceType!: string;

  @Column({ name: 'source_id', type: 'uuid' })
  sourceId!: string;

  @Column({ length: 240, nullable: true, type: 'varchar' })
  reason!: string | null;

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
