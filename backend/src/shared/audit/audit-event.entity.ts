import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'audit_events' })
@Index('ix_audit_events_business_time', ['businessId', 'occurredAt'])
export class AuditEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_id', nullable: true, type: 'uuid' })
  businessId!: string | null;

  @Column({ name: 'actor_user_id', nullable: true, type: 'uuid' })
  actorUserId!: string | null;

  @Column({ length: 100, type: 'varchar' })
  action!: string;

  @Column({ length: 80, name: 'resource_type', type: 'varchar' })
  resourceType!: string;

  @Column({ name: 'resource_id', nullable: true, type: 'uuid' })
  resourceId!: string | null;

  @Column({ default: {}, type: 'jsonb' })
  details!: Record<string, unknown>;

  @CreateDateColumn({ name: 'occurred_at', type: 'timestamptz' })
  occurredAt!: Date;
}
