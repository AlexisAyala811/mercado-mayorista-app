import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';

import { PotatoVarietyEntity } from '../../catalog/entities/potato-variety.entity.js';

export enum ReceptionState {
  Draft = 'draft',
  Weighing = 'weighing',
  Weighed = 'weighed',
  Settled = 'settled',
  Voided = 'voided',
}

@Entity({ name: 'receptions' })
@Index('ix_receptions_business_received', ['businessId', 'receivedOn'])
@Index(
  'uq_receptions_business_operation',
  ['businessId', 'clientOperationId'],
  { unique: true },
)
export class ReceptionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @Column({ name: 'client_operation_id', type: 'uuid' })
  clientOperationId!: string;

  @Column({ name: 'provider_id', type: 'uuid' })
  providerId!: string;

  @Column({
    length: 32,
    name: 'provider_phone',
    nullable: true,
    type: 'varchar',
  })
  providerPhone!: string | null;

  @Column({ name: 'vehicle_id', nullable: true, type: 'uuid' })
  vehicleId!: string | null;

  @Column({ length: 160, name: 'driver_name', type: 'varchar' })
  driverName!: string;

  @Column({ name: 'received_on', type: 'date' })
  receivedOn!: string;

  @Column({ enum: ReceptionState, enumName: 'reception_state', type: 'enum' })
  state!: ReceptionState;

  @Column({ default: 0, type: 'integer' })
  version!: number;

  @Column({ name: 'close_operation_id', nullable: true, type: 'uuid' })
  closeOperationId!: string | null;

  @Column({ name: 'closed_at', nullable: true, type: 'timestamptz' })
  closedAt!: Date | null;

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

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToMany(() => PotatoVarietyEntity)
  @JoinTable({
    name: 'reception_expected_varieties',
    joinColumn: { name: 'reception_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'variety_id', referencedColumnName: 'id' },
  })
  expectedVarieties!: Relation<PotatoVarietyEntity[]>;
}
