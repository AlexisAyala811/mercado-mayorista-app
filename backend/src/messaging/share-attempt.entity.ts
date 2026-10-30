import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type ShareState = 'prepared' | 'sharing_requested' | 'failed';
@Entity({ name: 'message_share_attempts' })
@Index('uq_message_share_operation', ['businessId', 'clientOperationId'], { unique: true })
export class ShareAttemptEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'business_id', type: 'uuid' }) businessId!: string;
  @Column({ name: 'actor_user_id', type: 'uuid' }) actorUserId!: string;
  @Column({ name: 'client_operation_id', type: 'uuid' }) clientOperationId!: string;
  @Column({ name: 'recipient_id', type: 'uuid' }) recipientId!: string;
  @Column({ name: 'recipient_kind', type: 'varchar', length: 16 }) recipientKind!: 'buyer' | 'provider';
  @Column({ name: 'recipient_name', type: 'varchar', length: 160 }) recipientName!: string;
  @Column({ type: 'varchar', length: 16 }) channel!: 'whatsapp' | 'email';
  @Column({ type: 'varchar', length: 160 }) filename!: string;
  @Column({ name: 'mime_type', type: 'varchar', length: 100 }) mimeType!: string;
  @Column({ name: 'size_bytes', type: 'integer' }) sizeBytes!: number;
  @Column({ type: 'varchar', length: 24 }) state!: ShareState;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}
