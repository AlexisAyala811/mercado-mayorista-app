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

@Entity({ name: 'businesses' })
export class BusinessEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 160, name: 'display_name', type: 'varchar' })
  displayName!: string;

  @Column({ default: true, name: 'is_active', type: 'boolean' })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => UserEntity, (user) => user.business)
  users!: Relation<UserEntity[]>;
}
