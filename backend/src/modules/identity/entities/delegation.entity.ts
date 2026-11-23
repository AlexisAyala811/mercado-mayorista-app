import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'delegations' })
@Index('ix_delegations_business_time', ['businessId', 'startsAt', 'expiresAt'])
@Index('ix_delegations_assistant_time', [
  'assistantUserId',
  'startsAt',
  'expiresAt',
])
export class DelegationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @Column({ name: 'assistant_user_id', type: 'uuid' })
  assistantUserId!: string;

  @Column({ name: 'authorized_by_user_id', type: 'uuid' })
  authorizedByUserId!: string;

  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt!: Date;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ length: 240, nullable: true, type: 'varchar' })
  reason!: string | null;

  @Column({ name: 'revoked_at', nullable: true, type: 'timestamptz' })
  revokedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
