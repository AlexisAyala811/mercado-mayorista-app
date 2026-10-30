import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'receipt_documents' })
@Index(
  'uq_receipt_documents_source_version',
  ['businessId', 'sourceType', 'sourceId', 'sourceVersion'],
  { unique: true },
)
@Index('ix_receipt_documents_business_source', [
  'businessId',
  'sourceType',
  'sourceId',
])
export class ReceiptDocumentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @Column({ length: 40, name: 'source_type', type: 'varchar' })
  sourceType!: string;

  @Column({ name: 'source_id', type: 'uuid' })
  sourceId!: string;

  @Column({ length: 120, name: 'source_version', type: 'varchar' })
  sourceVersion!: string;

  @Column({ length: 220, type: 'varchar' })
  filename!: string;

  @Column({ length: 80, name: 'mime_type', type: 'varchar' })
  mimeType!: string;

  @Column({ type: 'bytea' })
  content!: Buffer;

  @Column({ length: 64, name: 'sha256', type: 'char' })
  sha256!: string;

  @Column({ name: 'retention_until', type: 'timestamptz' })
  retentionUntil!: Date;

  @Column({ name: 'invalidated_at', nullable: true, type: 'timestamptz' })
  invalidatedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
