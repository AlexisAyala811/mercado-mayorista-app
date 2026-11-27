import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

// Spec 023: one row per Administrator action. A retry with the same
// clientOperationId and the same data returns the stored result; with other
// data it is rejected (operation-id-conflict).
@Entity({ name: 'admin_operations' })
export class AdminOperationEntity {
  @PrimaryColumn({ name: 'client_operation_id', type: 'uuid' })
  clientOperationId!: string;

  @Column({ name: 'admin_user_id', type: 'uuid' })
  adminUserId!: string;

  @Column({ length: 40, type: 'varchar' })
  action!: string;

  @Column({ name: 'merchant_business_id', type: 'uuid' })
  merchantBusinessId!: string;

  @Column({ length: 64, type: 'char' })
  fingerprint!: string;

  @Column({ type: 'jsonb' })
  result!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
