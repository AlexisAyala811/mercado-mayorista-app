import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';

import { BusinessEntity } from './business.entity.js';
import { SessionEntity } from './session.entity.js';

export enum UserRole {
  Assistant = 'assistant',
  Wholesaler = 'wholesaler',
  // Spec 023: manages merchants' accounts; never sees their operations.
  Admin = 'admin',
}

@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @Column({ length: 80, type: 'varchar' })
  username!: string;

  @Column({
    length: 255,
    name: 'password_hash',
    select: false,
    type: 'varchar',
  })
  passwordHash!: string;

  @Column({ enum: UserRole, enumName: 'user_role', type: 'enum' })
  role!: UserRole;

  @Column({ default: true, name: 'is_active', type: 'boolean' })
  isActive!: boolean;

  // Spec 023: after a temporary password the session only allows changing it.
  @Column({ default: false, name: 'must_change_password', type: 'boolean' })
  mustChangePassword!: boolean;

  @Column({ name: 'last_login_at', nullable: true, type: 'timestamptz' })
  lastLoginAt!: Date | null;

  @Column({ default: 0, name: 'failed_login_attempts', type: 'integer' })
  failedLoginAttempts!: number;

  @Column({ name: 'last_failed_login_at', nullable: true, type: 'timestamptz' })
  lastFailedLoginAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => BusinessEntity, (business) => business.users, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'business_id' })
  business!: Relation<BusinessEntity>;

  @OneToMany(() => SessionEntity, (session) => session.user)
  sessions!: Relation<SessionEntity[]>;
}
