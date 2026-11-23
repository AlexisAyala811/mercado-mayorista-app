import type { MigrationInterface, QueryRunner } from 'typeorm';

// Installments of a voided purchase or sale were marked as "paid" with a zero
// balance, which reads as collected money. The enum is recreated instead of
// using ADD VALUE so the new value can be used inside the same transaction.
export class InstallmentVoidedState1793232000027 implements MigrationInterface {
  name = 'InstallmentVoidedState1793232000027';

  async up(runner: QueryRunner): Promise<void> {
    await runner.query(
      `CREATE TYPE "installment_state_v2" AS ENUM ('open', 'paid', 'voided')`,
    );
    await runner.query(
      `ALTER TABLE "account_installments" ALTER COLUMN "state" TYPE "installment_state_v2" USING "state"::text::"installment_state_v2"`,
    );
    await runner.query(`DROP TYPE "installment_state"`);
    await runner.query(
      `ALTER TYPE "installment_state_v2" RENAME TO "installment_state"`,
    );
    await runner.query(
      `UPDATE "account_installments" i SET "state" = 'voided'
       FROM "accounts" a
       WHERE a.id = i.account_id AND a.state = 'voided' AND i.state = 'paid'`,
    );
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(
      `CREATE TYPE "installment_state_v1" AS ENUM ('open', 'paid')`,
    );
    await runner.query(
      `ALTER TABLE "account_installments" ALTER COLUMN "state" TYPE "installment_state_v1"
       USING (CASE WHEN "state" = 'voided' THEN 'paid' ELSE "state"::text END)::"installment_state_v1"`,
    );
    await runner.query(`DROP TYPE "installment_state"`);
    await runner.query(
      `ALTER TYPE "installment_state_v1" RENAME TO "installment_state"`,
    );
  }
}
