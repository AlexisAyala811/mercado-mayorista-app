import {
  groupSacks,
  planPurchaseLots,
  PurchaseLotsError,
  purchaseLiquidCents,
  type SackForLots,
} from './purchase-lots.js';

const canchan = { varietyId: 'v-canchan', varietyName: 'Canchán' };
const peruanita = { varietyId: 'v-peruanita', varietyName: 'Peruanita' };
const primera = { qualityId: 'q-1ra', qualityName: '1ra' };
const noQuality = { qualityId: null, qualityName: null };

// Spec 010 example: 32 sacks of Canchán 1ra (1 612 kg) and 20 of Peruanita (1 000 kg).
function exampleSacks(): SackForLots[] {
  const sacks: SackForLots[] = [];
  for (let index = 0; index < 32; index += 1)
    sacks.push({
      ...canchan,
      ...primera,
      netWeightKg: index < 12 ? '51' : '50',
    });
  for (let index = 0; index < 20; index += 1)
    sacks.push({ ...peruanita, ...noQuality, netWeightKg: '50' });
  return sacks;
}

describe('purchase lots', () => {
  it('groups active sacks by variety and quality with stable letters', () => {
    const groups = groupSacks(exampleSacks());
    expect(groups).toEqual([
      expect.objectContaining({
        letter: 'A',
        netWeight: 1_612_000n,
        qualityId: 'q-1ra',
        sacks: 32,
        varietyId: 'v-canchan',
      }),
      expect.objectContaining({
        letter: 'B',
        netWeight: 1_000_000n,
        qualityId: null,
        sacks: 20,
        varietyId: 'v-peruanita',
      }),
    ]);
    expect(groupSacks([...exampleSacks()].reverse())).toEqual(groups);
  });

  it('puts the group without quality after the qualities of the same variety', () => {
    const groups = groupSacks([
      { ...canchan, ...noQuality, netWeightKg: '50' },
      { ...canchan, qualityId: 'q-2da', qualityName: '2da', netWeightKg: '50' },
      { ...canchan, ...primera, netWeightKg: '50' },
    ]);
    expect(groups.map((group) => [group.letter, group.qualityName])).toEqual([
      ['A', '1ra'],
      ['B', '2da'],
      ['C', null],
    ]);
  });

  it('prices each lot with its own basis and adds the gross of the spec example', () => {
    const { lots, grossCents } = planPurchaseLots(groupSacks(exampleSacks()), [
      { ...peruanita, ...noQuality, priceBasis: 'sack', unitPriceCents: 9000 },
      {
        ...canchan,
        ...primera,
        name: ' Canchán #1 ',
        priceBasis: 'kilogram',
        unitPriceCents: 145,
      },
    ]);
    expect(lots.map((lot) => [lot.letter, lot.name, lot.amountCents])).toEqual([
      ['A', 'Canchán #1', 233_740n],
      ['B', null, 180_000n],
    ]);
    expect(grossCents).toBe(413_740n);
  });

  it('rounds each lot half up before adding them', () => {
    const groups = groupSacks([
      { ...canchan, ...primera, netWeightKg: '0.005' },
      { ...peruanita, ...noQuality, netWeightKg: '0.005' },
    ]);
    // 0.005 kg × 100 cents/kg = 0.5 cents per lot, rounded up to 1 each (2 in all);
    // pricing the 0.010 kg together would give 1 cent.
    const { lots, grossCents } = planPurchaseLots(groups, [
      { ...canchan, ...primera, priceBasis: 'kilogram', unitPriceCents: 100 },
      {
        ...peruanita,
        ...noQuality,
        priceBasis: 'kilogram',
        unitPriceCents: 100,
      },
    ]);
    expect(lots.map((lot) => lot.amountCents)).toEqual([1n, 1n]);
    expect(grossCents).toBe(2n);
  });

  it.each([
    [
      'a missing group',
      [{ ...canchan, ...primera, priceBasis: 'kilogram', unitPriceCents: 145 }],
      'missing',
    ],
    [
      'an unexpected group',
      [
        { ...canchan, ...primera, priceBasis: 'kilogram', unitPriceCents: 145 },
        {
          ...peruanita,
          ...noQuality,
          priceBasis: 'sack',
          unitPriceCents: 9000,
        },
        { ...canchan, ...noQuality, priceBasis: 'sack', unitPriceCents: 9000 },
      ],
      'unexpected',
    ],
    [
      'a repeated group',
      [
        { ...canchan, ...primera, priceBasis: 'kilogram', unitPriceCents: 145 },
        { ...canchan, ...primera, priceBasis: 'kilogram', unitPriceCents: 150 },
        {
          ...peruanita,
          ...noQuality,
          priceBasis: 'sack',
          unitPriceCents: 9000,
        },
      ],
      'repeated',
    ],
  ] as const)('rejects %s', (_case, orders, field) => {
    let error: unknown;
    try {
      planPurchaseLots(groupSacks(exampleSacks()), orders);
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(PurchaseLotsError);
    expect((error as PurchaseLotsError).details[field]).not.toHaveLength(0);
  });

  it('refuses more than twenty lots', () => {
    const sacks = Array.from({ length: 21 }, (_, index) => ({
      ...canchan,
      netWeightKg: '50',
      qualityId: `q-${index}`,
      qualityName: `Calidad ${index}`,
    }));
    expect(() => groupSacks(sacks)).toThrow(PurchaseLotsError);
  });

  it('deducts the freight only when the provider bears it', () => {
    const input = {
      advancesCents: 10_000n,
      discountsCents: 0n,
      freightCents: 13_000n,
      grossCents: 413_740n,
    };
    expect(
      purchaseLiquidCents({ ...input, freightChargedTo: 'provider' }),
    ).toBe(390_740n);
    expect(
      purchaseLiquidCents({ ...input, freightChargedTo: 'wholesaler' }),
    ).toBe(403_740n);
  });
});
