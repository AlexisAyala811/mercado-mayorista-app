import { describe, expect, it } from 'vitest';

import dataSource from './data-source.js';

describe('database data source', () => {
  it('keeps schema synchronization disabled and registers every ordered migration', () => {
    expect(dataSource.options.synchronize).toBe(false);
    const configuredMigrations = dataSource.options.migrations ?? [];
    if (!Array.isArray(configuredMigrations)) {
      throw new Error('Expected an explicit ordered migration array.');
    }
    const migrations = configuredMigrations.map((migration) =>
      typeof migration === 'function'
        ? migration.name
        : migration.constructor.name,
    );
    expect(migrations).toEqual([
      'InitialIdentity1790208000001',
      'Catalogs1790208000002',
      'LogisticsCatalogs1790208000003',
      'AuditEvents1790208000004',
      'ReceptionDrafts1790208000005',
      'Buyers1790208000006',
      'TextIntegrity1790294400007',
      'Delegations1790294400008',
      'ReceptionWeighing1790294400009',
      'PurchasesInventoryAccounts1790294400010',
      'Sales1790294400011',
      'Stowage1790294400012',
      'ReceiptDocuments1790294400013',
      'ReceptionSackCorrections1790294400014',
      'SaleVersion1790294400015',
      'PurchaseVoids1790294400016',
      'FreightSettlements1790294400017',
      'CashOperationScope1790294400018',
      'CommercialReturnsAndValuation1790640000019',
      'SalesWithoutInventory1791331200020',
      'AnalyticsEvaluations1791763200021',
      'AnalyticsPublications1791763200022',
      'AnalyticsOutcomes1791763200023',
      'CommercialCharacteristics1791936000024',
      'OperationCharacteristics1791936000025',
      'Messaging1792972800026',
      'InstallmentVoidedState1793232000027',
      'ReceiptDocumentsPng1793318400028',
    ]);
    expect(new Set(migrations).size).toBe(migrations.length);
  });
});
