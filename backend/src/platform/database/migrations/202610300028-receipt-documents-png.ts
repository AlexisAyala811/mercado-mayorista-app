import type { MigrationInterface, QueryRunner } from 'typeorm';

// Spec 009: the buyer statement is kept as a PDF and as a PNG image, so the
// stored documents may now be images too.
export class ReceiptDocumentsPng1793318400028 implements MigrationInterface {
  name = 'ReceiptDocumentsPng1793318400028';

  async up(runner: QueryRunner): Promise<void> {
    await runner.query(
      `ALTER TABLE "receipt_documents" DROP CONSTRAINT "ck_receipt_documents_mime"`,
    );
    await runner.query(
      `ALTER TABLE "receipt_documents" ADD CONSTRAINT "ck_receipt_documents_mime"
       CHECK ("mime_type" IN ('application/pdf', 'image/png'))`,
    );
  }

  async down(runner: QueryRunner): Promise<void> {
    // Retained documents cannot be deleted, so the rollback refuses instead.
    const [{ images }] = (await runner.query(
      `SELECT count(*)::int AS images FROM "receipt_documents" WHERE "mime_type" <> 'application/pdf'`,
    )) as Array<{ images: number }>;
    if (images > 0)
      throw new Error(
        'No se puede revertir: existen imágenes conservadas dentro de su periodo de retención.',
      );
    await runner.query(
      `ALTER TABLE "receipt_documents" DROP CONSTRAINT "ck_receipt_documents_mime"`,
    );
    await runner.query(
      `ALTER TABLE "receipt_documents" ADD CONSTRAINT "ck_receipt_documents_mime"
       CHECK ("mime_type" = 'application/pdf')`,
    );
  }
}
