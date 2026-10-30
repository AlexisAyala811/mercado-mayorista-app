import 'dotenv/config';
import { Messaging1792972800026 } from './migrations/202610260026-messaging.js';
import { InstallmentVoidedState1793232000027 } from './migrations/202610290027-installment-voided-state.js';
import { ReceiptDocumentsPng1793318400028 } from './migrations/202610300028-receipt-documents-png.js';
import { ShareAttemptEntity } from '../messaging/share-attempt.entity.js';

import { DataSource } from 'typeorm';

import { InitialIdentity1790208000001 } from './migrations/202609240001-initial-identity.js';
import { Catalogs1790208000002 } from './migrations/202609240002-catalogs.js';
import { LogisticsCatalogs1790208000003 } from './migrations/202609240003-logistics-catalogs.js';
import { AuditEvents1790208000004 } from './migrations/202609240004-audit-events.js';
import { ReceptionDrafts1790208000005 } from './migrations/202609240005-reception-drafts.js';
import { Buyers1790208000006 } from './migrations/202609240006-buyers.js';
import { TextIntegrity1790294400007 } from './migrations/202609250007-text-integrity.js';
import { Delegations1790294400008 } from './migrations/202609250008-delegations.js';
import { ReceptionWeighing1790294400009 } from './migrations/202609250009-reception-weighing.js';
import { PurchasesInventoryAccounts1790294400010 } from './migrations/202609250010-purchases-inventory-accounts.js';
import { Sales1790294400011 } from './migrations/202609250011-sales.js';
import { Stowage1790294400012 } from './migrations/202609250012-stowage.js';
import { ReceiptDocuments1790294400013 } from './migrations/202609250013-receipt-documents.js';
import { ReceptionSackCorrections1790294400014 } from './migrations/202609250014-reception-sack-corrections.js';
import { SaleVersion1790294400015 } from './migrations/202609250015-sale-version.js';
import { PurchaseVoids1790294400016 } from './migrations/202609250016-purchase-voids.js';
import { FreightSettlements1790294400017 } from './migrations/202609250017-freight-settlements.js';
import { CashOperationScope1790294400018 } from './migrations/202609250018-cash-operation-scope.js';
import { CommercialReturnsAndValuation1790640000019 } from './migrations/202609290019-commercial-returns-and-valuation.js';
import { SalesWithoutInventory1791331200020 } from './migrations/202610070020-sales-without-inventory.js';
import { AnalyticsEvaluations1791763200021 } from './migrations/202610120021-analytics-evaluations.js';
import { AnalyticsPublications1791763200022 } from './migrations/202610120022-analytics-publications.js';
import { AnalyticsOutcomes1791763200023 } from './migrations/202610120023-analytics-outcomes.js';
import {CommercialCharacteristics1791936000024} from './migrations/202610140024-commercial-characteristics.js';
import {OperationCharacteristics1791936000025} from './migrations/202610140025-operation-characteristics.js';
import {CommercialCharacteristicEntity} from '../catalog/entities/commercial-characteristic.entity.js';
import { AuditEventEntity } from '../audit/audit-event.entity.js';
import { PotatoVarietyEntity } from '../catalog/entities/potato-variety.entity.js';
import { ProviderEntity } from '../catalog/entities/provider.entity.js';
import { BuyerEntity } from '../catalog/entities/buyer.entity.js';
import { CarrierEntity } from '../logistics/entities/carrier.entity.js';
import { VehicleEntity } from '../logistics/entities/vehicle.entity.js';
import { ReceptionEntity } from '../reception/entities/reception.entity.js';
import { ReceptionSackEntity } from '../reception/entities/reception-sack.entity.js';
import { PurchaseSettlementEntity } from '../purchase/entities/purchase-settlement.entity.js';
import { InventoryLotEntity } from '../inventory/entities/inventory-lot.entity.js';
import { InventoryMovementEntity } from '../inventory/entities/inventory-movement.entity.js';
import { InventoryLotValuationEntity } from '../inventory/entities/inventory-lot-valuation.entity.js';
import { AccountEntity } from '../accounts/entities/account.entity.js';
import { AccountInstallmentEntity } from '../accounts/entities/account-installment.entity.js';
import { AccountPaymentEntity } from '../accounts/entities/account-payment.entity.js';
import { AccountPaymentAllocationEntity } from '../accounts/entities/account-payment-allocation.entity.js';
import { CashMovementEntity } from '../accounts/entities/cash-movement.entity.js';
import { SaleEntity } from '../sales/entities/sale.entity.js';
import { SaleLineEntity } from '../sales/entities/sale-line.entity.js';
import { SaleLineCostEntity } from '../sales/entities/sale-line-cost.entity.js';
import { SaleReturnEntity } from '../sales/entities/sale-return.entity.js';
import { SaleReturnLineEntity } from '../sales/entities/sale-return-line.entity.js';
import { StowageEntryEntity } from '../stowage/entities/stowage-entry.entity.js';
import { StowageSettlementEntity } from '../stowage/entities/stowage-settlement.entity.js';
import { WorkGroupEntity } from '../stowage/entities/work-group.entity.js';
import { ReceiptDocumentEntity } from '../receipts/receipt-document.entity.js';
import { FreightEntryEntity } from '../freight/entities/freight-entry.entity.js';
import { FreightSettlementEntity } from '../freight/entities/freight-settlement.entity.js';
import { BusinessEntity } from '../identity/entities/business.entity.js';
import { SessionEntity } from '../identity/entities/session.entity.js';
import { UserEntity } from '../identity/entities/user.entity.js';
import { DelegationEntity } from '../identity/entities/delegation.entity.js';
import { createPostgresOptions } from './postgres-options.js';

export default new DataSource({
  ...createPostgresOptions({
    connectTimeoutMs: Number(process.env.DATABASE_CONNECT_TIMEOUT_MS ?? 5000),
    database: process.env.DATABASE_NAME ?? 'mercado',
    host: process.env.DATABASE_HOST ?? 'localhost',
    logging: process.env.NODE_ENV === 'development',
    password: process.env.DATABASE_PASSWORD ?? '',
    poolSize: Number(process.env.DATABASE_POOL_SIZE ?? 10),
    port: Number(process.env.DATABASE_PORT ?? 5432),
    ssl: parseBoolean(process.env.DATABASE_SSL, false),
    sslRejectUnauthorized: parseBoolean(
      process.env.DATABASE_SSL_REJECT_UNAUTHORIZED,
      true,
    ),
    username: process.env.DATABASE_USER ?? 'mercado',
  }),
  entities: [
    ShareAttemptEntity,
    BusinessEntity,
    UserEntity,
    DelegationEntity,
    SessionEntity,
    ProviderEntity,
    BuyerEntity,
    PotatoVarietyEntity,
    CommercialCharacteristicEntity,
    CarrierEntity,
    VehicleEntity,
    AuditEventEntity,
    ReceptionEntity,
    ReceptionSackEntity,
    PurchaseSettlementEntity,
    InventoryLotEntity,
    InventoryMovementEntity,
    InventoryLotValuationEntity,
    AccountEntity,
    AccountInstallmentEntity,
    AccountPaymentEntity,
    AccountPaymentAllocationEntity,
    CashMovementEntity,
    SaleEntity,
    SaleLineEntity,
    SaleLineCostEntity,
    SaleReturnEntity,
    SaleReturnLineEntity,
    WorkGroupEntity,
    StowageSettlementEntity,
    StowageEntryEntity,
    ReceiptDocumentEntity,
    FreightEntryEntity,
    FreightSettlementEntity,
  ],
  migrations: [
    InitialIdentity1790208000001,
    Catalogs1790208000002,
    LogisticsCatalogs1790208000003,
    AuditEvents1790208000004,
    ReceptionDrafts1790208000005,
    Buyers1790208000006,
    TextIntegrity1790294400007,
    Delegations1790294400008,
    ReceptionWeighing1790294400009,
    PurchasesInventoryAccounts1790294400010,
    Sales1790294400011,
    Stowage1790294400012,
    ReceiptDocuments1790294400013,
    ReceptionSackCorrections1790294400014,
    SaleVersion1790294400015,
    PurchaseVoids1790294400016,
    FreightSettlements1790294400017,
    CashOperationScope1790294400018,
    CommercialReturnsAndValuation1790640000019,
    SalesWithoutInventory1791331200020,
    AnalyticsEvaluations1791763200021,
    AnalyticsPublications1791763200022,
    AnalyticsOutcomes1791763200023,
    CommercialCharacteristics1791936000024,
    OperationCharacteristics1791936000025,
    Messaging1792972800026,
    InstallmentVoidedState1793232000027,
    ReceiptDocumentsPng1793318400028,
  ],
});

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  return value.toLocaleLowerCase() === 'true';
}
