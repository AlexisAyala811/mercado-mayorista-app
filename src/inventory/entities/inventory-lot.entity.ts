import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum InventoryLotState {
  Pending = 'pending',
  Available = 'available',
  Depleted = 'depleted',
  Blocked = 'blocked',
  Voided = 'voided',
}

@Entity({ name: 'inventory_lots' })
@Index('uq_inventory_lots_reception_variety', ['receptionId', 'varietyId'], {
  unique: true,
})
@Index('ix_inventory_lots_business_state', ['businessId', 'state'])
export class InventoryLotEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @Column({ name: 'reception_id', type: 'uuid' })
  receptionId!: string;

  @Column({ name: 'variety_id', type: 'uuid' })
  varietyId!: string;

  @Column({
    enum: InventoryLotState,
    enumName: 'inventory_lot_state',
    type: 'enum',
  })
  state!: InventoryLotState;

  @Column({ name: 'initial_sacks', type: 'integer' })
  initialSacks!: number;

  @Column({ name: 'available_sacks', type: 'integer' })
  availableSacks!: number;

  @Column({
    name: 'initial_weight_kg',
    precision: 14,
    scale: 3,
    type: 'numeric',
  })
  initialWeightKg!: string;

  @Column({
    name: 'available_weight_kg',
    precision: 14,
    scale: 3,
    type: 'numeric',
  })
  availableWeightKg!: string;

  @Column({ default: 0, type: 'integer' })
  version!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
