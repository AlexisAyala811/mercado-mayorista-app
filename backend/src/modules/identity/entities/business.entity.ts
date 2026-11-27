import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';

import { UserEntity } from './user.entity.js';

// Spec 023: a merchant is a client business; the single platform business only
// holds the Administrator and never receives operations.
export enum BusinessKind {
  Merchant = 'merchant',
  Platform = 'platform',
}

@Entity({ name: 'businesses' })
export class BusinessEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 160, name: 'display_name', type: 'varchar' })
  displayName!: string;

  @Column({ default: true, name: 'is_active', type: 'boolean' })
  isActive!: boolean;

  @Column({
    default: BusinessKind.Merchant,
    enum: BusinessKind,
    enumName: 'business_kind',
    type: 'enum',
  })
  kind!: BusinessKind;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => UserEntity, (user) => user.business)
  users!: Relation<UserEntity[]>;
}
