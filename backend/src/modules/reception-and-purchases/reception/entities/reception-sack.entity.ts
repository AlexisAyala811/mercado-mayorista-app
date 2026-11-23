import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'reception_sacks' })
@Index(
  'uq_reception_sacks_business_operation',
  ['businessId', 'clientOperationId'],
  { unique: true },
)
@Index('ix_reception_sacks_reception', ['receptionId'])
export class ReceptionSackEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @Column({ name: 'reception_id', type: 'uuid' })
  receptionId!: string;

  @Column({ name: 'client_operation_id', type: 'uuid' })
  clientOperationId!: string;

  @Column({ type: 'integer' })
  sequence!: number;

  @Column({ name: 'variety_id', type: 'uuid' })
  varietyId!: string;

  @Column({name:'quality_id',type:'uuid',nullable:true}) qualityId!:string|null;
  @Column({name:'quality_name',type:'varchar',length:120,nullable:true}) qualityName!:string|null;
  @Column({name:'origin_id',type:'uuid',nullable:true}) originId!:string|null;
  @Column({name:'origin_name',type:'varchar',length:120,nullable:true}) originName!:string|null;

  @Column({ name: 'gross_weight_kg', precision: 12, scale: 3, type: 'numeric' })
  grossWeightKg!: string;

  @Column({ name: 'tare_kg', precision: 12, scale: 3, type: 'numeric' })
  tareKg!: string;

  @Column({ name: 'net_weight_kg', precision: 12, scale: 3, type: 'numeric' })
  netWeightKg!: string;

  @Column({ name: 'corrected_from_sack_id', nullable: true, type: 'uuid' })
  correctedFromSackId!: string | null;

  @Column({ name: 'voided_at', nullable: true, type: 'timestamptz' })
  voidedAt!: Date | null;

  @Column({ name: 'void_operation_id', nullable: true, type: 'uuid' })
  voidOperationId!: string | null;

  @Column({
    length: 240,
    name: 'correction_reason',
    nullable: true,
    type: 'varchar',
  })
  correctionReason!: string | null;

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
