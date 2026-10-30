import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum InstallmentState {
  Open = 'open',
  Paid = 'paid',
}

@Entity({ name: 'account_installments' })
@Index('ix_account_installments_due', ['accountId', 'dueOn'])
export class AccountInstallmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'account_id', type: 'uuid' })
  accountId!: string;

  @Column({ name: 'due_on', type: 'date' })
  dueOn!: string;

  @Column({ name: 'initial_amount_cents', type: 'bigint' })
  initialAmountCents!: string;

  @Column({ name: 'balance_cents', type: 'bigint' })
  balanceCents!: string;

  @Column({
    enum: InstallmentState,
    enumName: 'installment_state',
    type: 'enum',
  })
  state!: InstallmentState;
}
