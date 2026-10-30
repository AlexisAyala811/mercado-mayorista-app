import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'buyers' })
@Index('ix_buyers_business', ['businessId'])
export class BuyerEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @Column({ length: 160, type: 'varchar' })
  name!: string;

  @Column({ length: 32, nullable: true, type: 'varchar' })
  phone!: string | null;

  @Column({
    length: 160,
    nullable: true,
    name: 'destination_department',
    type: 'varchar',
  })
  destinationDepartment!: string | null;

  @Column({ name: 'credit_limit_cents', nullable: true, type: 'bigint' })
  creditLimitCents!: string | null;

  @Column({ default: true, name: 'is_active', type: 'boolean' })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
