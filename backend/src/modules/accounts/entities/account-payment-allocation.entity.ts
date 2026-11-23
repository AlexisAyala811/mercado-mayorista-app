import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'account_payment_allocations' })
@Index('uq_account_payment_allocations', ['paymentId', 'installmentId'], {
  unique: true,
})
export class AccountPaymentAllocationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'payment_id', type: 'uuid' })
  paymentId!: string;

  @Column({ name: 'installment_id', type: 'uuid' })
  installmentId!: string;

  @Column({ name: 'amount_cents', type: 'bigint' })
  amountCents!: string;
}
