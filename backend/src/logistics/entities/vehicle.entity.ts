import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';

import { CarrierEntity } from './carrier.entity.js';

@Entity({ name: 'vehicles' })
@Index('ix_vehicles_business', ['businessId'])
export class VehicleEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @Column({ length: 20, type: 'varchar' })
  plate!: string;

  @Column({ name: 'carrier_id', nullable: true, type: 'uuid' })
  carrierId!: string | null;

  @Column({ length: 160, nullable: true, type: 'varchar' })
  description!: string | null;

  @Column({ default: true, name: 'is_active', type: 'boolean' })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => CarrierEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'carrier_id' })
  carrier!: Relation<CarrierEntity> | null;
}
