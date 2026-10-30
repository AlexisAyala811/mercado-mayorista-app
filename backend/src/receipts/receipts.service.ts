import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import { DataSource, IsNull, type Repository } from 'typeorm';

import { BuyerEntity } from '../catalog/entities/buyer.entity.js';
import { AuditService } from '../audit/audit.service.js';
import { PotatoVarietyEntity } from '../catalog/entities/potato-variety.entity.js';
import { ProviderEntity } from '../catalog/entities/provider.entity.js';
import { BusinessEntity } from '../identity/entities/business.entity.js';
import type { SessionIdentity } from '../identity/application/ports/session-identity-reader.js';
import { InventoryLotEntity } from '../inventory/entities/inventory-lot.entity.js';
import { InventoryMovementEntity } from '../inventory/entities/inventory-movement.entity.js';
import { PurchaseSettlementEntity } from '../purchase/entities/purchase-settlement.entity.js';
import { ReceptionSackEntity } from '../reception/entities/reception-sack.entity.js';
import { ReceptionEntity } from '../reception/entities/reception.entity.js';
import { SaleLineEntity } from '../sales/entities/sale-line.entity.js';
import { SaleEntity } from '../sales/entities/sale.entity.js';
import { SaleReturnEntity } from '../sales/entities/sale-return.entity.js';
import { SaleReturnLineEntity } from '../sales/entities/sale-return-line.entity.js';
import {
  formatMoney,
  renderReceiptPdf,
  type ReceiptLine,
} from './pdf-receipt.renderer.js';
import { ReceiptDocumentEntity } from './receipt-document.entity.js';
import { receiptCommercialDate, receiptCivilDateVersion } from './receipt-date.js';
import {
  receiptCharacteristics,
  receiptCharacteristicsVersion,
  receiptSackGroups,
} from './receipt-characteristics.js';

@Injectable()
export class ReceiptsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
    @InjectRepository(BusinessEntity)
    private readonly businesses: Repository<BusinessEntity>,
    @InjectRepository(PurchaseSettlementEntity)
    private readonly purchases: Repository<PurchaseSettlementEntity>,
    @InjectRepository(ReceptionEntity)
    private readonly receptions: Repository<ReceptionEntity>,
    @InjectRepository(ReceptionSackEntity)
    private readonly sacks: Repository<ReceptionSackEntity>,
    @InjectRepository(ProviderEntity)
    private readonly providers: Repository<ProviderEntity>,
    @InjectRepository(PotatoVarietyEntity)
    private readonly varieties: Repository<PotatoVarietyEntity>,
    @InjectRepository(SaleEntity)
    private readonly sales: Repository<SaleEntity>,
    @InjectRepository(SaleLineEntity)
    private readonly saleLines: Repository<SaleLineEntity>,
    @InjectRepository(SaleReturnEntity)
    private readonly saleReturns: Repository<SaleReturnEntity>,
    @InjectRepository(SaleReturnLineEntity)
    private readonly saleReturnLines: Repository<SaleReturnLineEntity>,
    @InjectRepository(InventoryLotEntity)
    private readonly lots: Repository<InventoryLotEntity>,
    @InjectRepository(InventoryMovementEntity)
    private readonly movements: Repository<InventoryMovementEntity>,
    @InjectRepository(BuyerEntity)
    private readonly buyers: Repository<BuyerEntity>,
    @InjectRepository(ReceiptDocumentEntity)
    private readonly documents: Repository<ReceiptDocumentEntity>,
  ) {}

  async purchase(identity: SessionIdentity, purchaseId: string) {
    const { businessId } = identity;
    const settlement = await this.purchases.findOne({
      where: { businessId, id: purchaseId },
    });
    if (!settlement) throw new NotFoundException('Compra no encontrada.');
    const [business, reception] = await Promise.all([
      this.businesses.findOneByOrFail({ id: businessId }),
      this.receptions.findOneByOrFail({
        businessId,
        id: settlement.receptionId,
      }),
    ]);
    const [provider, activeSacks] = await Promise.all([
      this.providers.findOneByOrFail({ businessId, id: reception.providerId }),
      this.sacks.find({
        where: { businessId, receptionId: reception.id, voidedAt: IsNull() },
        order: { sequence: 'ASC' },
      }),
    ]);
    const varietyMap = await this.varietyNames(
      businessId,
      activeSacks.map((sack) => sack.varietyId),
    );
    const lines: ReceiptLine[] = receiptSackGroups(activeSacks).map(
      (value) => ({
        description: varietyMap.get(value.source.varietyId) ?? 'Variedad',
        detail: `${value.sacks} saco(s) · ${formatKilograms(value.weight)} kg netos\n${receiptCharacteristics(value.source)}`,
      }),
    );
    return this.getOrCreateDocument(
      identity,
      'purchase',
      settlement.id,
      receiptCharacteristicsVersion(`${settlement.state}:v${settlement.version}`),
      async () =>
        renderReceiptPdf({
          businessName: business.displayName,
          counterpartyLabel: 'Proveedor',
          counterpartyName: provider.name,
          date: reception.receivedOn,
          identifier: settlement.id,
          lines,
          operationId: settlement.clientOperationId,
          title:
            settlement.state === 'voided'
              ? 'Comprobante de compra anulada'
              : 'Comprobante de compra',
          totals: [
            {
              label: 'Importe bruto',
              value: formatMoney(settlement.grossAmountCents),
            },
            {
              label: 'Flete',
              value: formatMoney(settlement.freightAmountCents),
            },
            {
              label: 'Adelantos',
              value: formatMoney(settlement.advancesCents),
            },
            {
              label: 'Descuentos',
              value: formatMoney(settlement.discountsCents),
            },
            {
              label: 'Líquido',
              value: formatMoney(settlement.liquidAmountCents),
            },
            {
              label: 'Forma de pago',
              value: settlement.paymentMode === 'cash' ? 'Contado' : 'Crédito',
            },
          ],
        }),
    );
  }

  async sale(identity: SessionIdentity, saleId: string) {
    const { businessId } = identity;
    const sale = await this.sales.findOne({
      where: { businessId, id: saleId },
    });
    if (!sale) throw new NotFoundException('Venta no encontrada.');
    const [business, buyer, lines] = await Promise.all([
      this.businesses.findOneByOrFail({ id: businessId }),
      this.buyers.findOneByOrFail({ businessId, id: sale.buyerId }),
      this.saleLines.find({ where: { saleId: sale.id } }),
    ]);
    const varietyMap = await this.varietyNames(
      businessId,
      lines.map((line) => line.varietyId),
    );
    const receiptLines: ReceiptLine[] = lines.map((line) => ({
      amount: formatMoney(line.subtotalCents),
      description: varietyMap.get(line.varietyId) ?? 'Variedad',
      detail: `${line.sacks} saco(s) · ${line.weightKg} kg · ${formatMoney(line.unitPriceCents)} por ${line.priceBasis === 'kilogram' ? 'kg' : 'saco'}\n${receiptCharacteristics(line)}`,
    }));
    const sourceVersion = receiptCharacteristicsVersion(
      receiptCivilDateVersion(sale.state, sale.version),
    );
    return this.getOrCreateDocument(
      identity,
      'sale',
      sale.id,
      sourceVersion,
      async () =>
        renderReceiptPdf({
          businessName: business.displayName,
          counterpartyLabel: 'Comprador',
          counterpartyName: buyer.name,
          date: receiptCommercialDate(sale.createdAt),
          identifier: sale.id,
          lines: receiptLines,
          operationId: sale.clientOperationId,
          title:
            sale.state === 'voided'
              ? 'Comprobante de venta anulada'
              : 'Comprobante de venta',
          totals: [
            {
              label: 'Importe bruto',
              value: formatMoney(sale.grossAmountCents),
            },
            { label: 'Flete', value: formatMoney(sale.freightAmountCents) },
            { label: 'Descuentos', value: formatMoney(sale.discountsCents) },
            { label: 'Total', value: formatMoney(sale.totalAmountCents) },
            {
              label: 'Forma de pago',
              value: sale.paymentMode === 'cash' ? 'Contado' : 'Crédito',
            },
          ],
        }),
    );
  }

  async saleReturn(identity: SessionIdentity, saleReturnId: string) {
    const { businessId } = identity;
    const saleReturn = await this.saleReturns.findOne({
      where: { businessId, id: saleReturnId },
    });
    if (!saleReturn)
      throw new NotFoundException('Devolución comercial no encontrada.');
    const sale = await this.sales.findOne({
      where: { businessId, id: saleReturn.saleId },
    });
    if (!sale) throw new NotFoundException('Venta no encontrada.');
    const [business, buyer, returnLines] = await Promise.all([
      this.businesses.findOneByOrFail({ id: businessId }),
      this.buyers.findOneByOrFail({ businessId, id: sale.buyerId }),
      this.saleReturnLines.find({ where: { saleReturnId } }),
    ]);
    const sourceLines = await this.saleLines.findBy(
      returnLines.map((line) => ({ id: line.saleLineId, saleId: sale.id })),
    );
    const lineMap = new Map(sourceLines.map((line) => [line.id, line]));
    const varietyMap = await this.varietyNames(
      businessId,
      sourceLines.map((line) => line.varietyId),
    );
    const receiptLines: ReceiptLine[] = returnLines.map((returnLine) => {
      const sourceLine = lineMap.get(returnLine.saleLineId);
      return {
        amount: formatMoney(returnLine.netRefundCents),
        description: sourceLine
          ? (varietyMap.get(sourceLine.varietyId) ?? 'Variedad')
          : 'Línea de venta',
        detail: `${returnLine.returnedSacks} saco(s) · ${returnLine.returnedWeightKg} kg · bruto ${formatMoney(returnLine.authorizedGrossCents)} · descuento ${formatMoney(returnLine.allocatedSaleDiscountCents)}\n${receiptCharacteristics(sourceLine ?? {})}`,
      };
    });
    return this.getOrCreateDocument(
      identity,
      'sale-return',
      saleReturn.id,
      receiptCharacteristicsVersion(
        receiptCivilDateVersion('confirmed', saleReturn.saleVersionAfter),
      ),
      async () =>
        renderReceiptPdf({
          businessName: business.displayName,
          counterpartyLabel: 'Comprador',
          counterpartyName: buyer.name,
          date: receiptCommercialDate(saleReturn.createdAt),
          identifier: saleReturn.id,
          lines: receiptLines,
          operationId: saleReturn.clientOperationId,
          title: 'Comprobante interno de devolución comercial',
          totals: [
            {
              label: 'Bruto autorizado',
              value: formatMoney(saleReturn.merchandiseGrossCents),
            },
            {
              label: 'Descuento prorrateado',
              value: formatMoney(saleReturn.allocatedSaleDiscountCents),
            },
            {
              label: 'Ajuste de flete',
              value: formatMoney(saleReturn.freightAdjustmentCents),
            },
            {
              label: 'Crédito a cuenta',
              value: formatMoney(saleReturn.accountCreditCents),
            },
            {
              label: 'Salida de caja',
              value: formatMoney(saleReturn.cashRefundCents),
            },
            {
              label: 'Total devuelto',
              value: formatMoney(saleReturn.totalRefundCents),
            },
            { label: 'Venta vinculada', value: sale.id },
          ],
        }),
    );
  }

  private async varietyNames(businessId: string, ids: string[]) {
    const uniqueIds = [...new Set(ids)];
    if (!uniqueIds.length) return new Map<string, string>();
    const varieties = await this.varieties.findBy(
      uniqueIds.map((id) => ({ businessId, id })),
    );
    return new Map(varieties.map((variety) => [variety.id, variety.name]));
  }

  private async getOrCreateDocument(
    identity: SessionIdentity,
    sourceType: string,
    sourceId: string,
    sourceVersion: string,
    render: () => Promise<Buffer>,
  ) {
    const { businessId } = identity;
    const stored = await this.documents.findOne({
      where: { businessId, sourceId, sourceType, sourceVersion },
    });
    if (stored) {
      await this.audit.recordDirect({
        action: 'receipt.accessed',
        actorUserId: identity.userId,
        businessId,
        details: { sha256: stored.sha256 },
        resourceId: stored.id,
        resourceType: 'receipt-document',
      });
      return stored.content;
    }
    const content = await render();
    return this.dataSource.transaction(async (manager) => {
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
        [businessId, `${sourceType}:${sourceId}`],
      );
      const repository = manager.getRepository(ReceiptDocumentEntity);
      const repeated = await repository.findOne({
        where: { businessId, sourceId, sourceType, sourceVersion },
      });
      if (repeated) return repeated.content;
      await repository
        .createQueryBuilder()
        .update(ReceiptDocumentEntity)
        .set({ invalidatedAt: new Date() })
        .where('business_id = :businessId', { businessId })
        .andWhere('source_type = :sourceType', { sourceType })
        .andWhere('source_id = :sourceId', { sourceId })
        .andWhere('invalidated_at IS NULL')
        .execute();
      const retentionUntil = new Date();
      retentionUntil.setUTCFullYear(
        retentionUntil.getUTCFullYear() +
          this.config.getOrThrow<number>('EVIDENCE_RETENTION_YEARS'),
      );
      retentionUntil.setUTCDate(retentionUntil.getUTCDate() + 1);
      const document = await repository.save(
        repository.create({
          businessId,
          content,
          filename: `${sourceType}-${sourceId}.pdf`,
          invalidatedAt: null,
          mimeType: 'application/pdf',
          retentionUntil,
          sha256: createHash('sha256').update(content).digest('hex'),
          sourceId,
          sourceType,
          sourceVersion,
        }),
      );
      await this.audit.record(manager, {
        action: 'receipt.generated',
        actorUserId: identity.userId,
        businessId,
        details: {
          sha256: document.sha256,
          sourceId,
          sourceType,
          sourceVersion,
        },
        resourceId: document.id,
        resourceType: 'receipt-document',
      });
      return document.content;
    });
  }
}

function formatKilograms(value: bigint) {
  return `${value / 1000n}.${(value % 1000n).toString().padStart(3, '0')}`;
}
