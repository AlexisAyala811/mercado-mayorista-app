import { loadHistoricalEvaluationInputs, loadHistoricalPriceSnapshot } from './historical-price-snapshots.js';
import type { AnalyticsObservation } from './analytics-calculation.js';
import { evaluateHistoricalSnapshots } from './predictive-engine.js';

it('builds eight independent training/actual cutoffs and a final 26-week snapshot', async () => {
  const query = vi.fn(async (_sql: string, parameters: unknown[]) => {
    const from = String(parameters[2]); const to = String(parameters[3]);
    const rows: AnalyticsObservation[] = [];
    for (let stamp = Date.parse(from); stamp <= Date.parse(to); stamp += 7 * 86400000) {
      const weekStart = new Date(stamp).toISOString().slice(0, 10);
      const index = (stamp - Date.parse('2026-04-13')) / (7 * 86400000);
      for (let sale = 0; sale < 5; sale++) rows.push({ operationType: 'sale', operationId: `${weekStart}-${sale}`, varietyId: 'v', varietyName: 'Variedad', weekStart, sacks: 1, weightKg: '10.000', merchandiseCents: index % 2 ? '4000' : '2000', compensationIds: [] });
    }
    return rows;
  });
  const inputs = await loadHistoricalEvaluationInputs(query, 'b', 'v', '2026-10-12');
  expect(query).toHaveBeenCalledTimes(17);
  expect(inputs.window.from).toBe('2026-04-13');
  expect(inputs.final.points).toHaveLength(26);
  expect(inputs.snapshots[0]!.training.cutoffExclusive).toBe('2026-08-17');
  expect(inputs.snapshots[0]!.actual.cutoffExclusive).toBe('2026-08-24');
  expect(inputs.folds.map(fold => fold.training.length)).toEqual([18, 19, 20, 21, 22, 23, 24, 25]);
  expect(evaluateHistoricalSnapshots(inputs.folds).coveredWeeks).toBe(8);
});

it('rejects incomplete or invalid windows before querying, and missing actuals without imputing', async () => {
  const query = vi.fn().mockResolvedValue([]);
  for (const [from, to, cutoff] of [['2026-04-14', '2026-04-19', '2026-04-20'], ['2026-04-13', '2026-04-20', '2026-04-20'], ['2026-02-30', '2026-04-19', '2026-04-20']]) {
    await expect(loadHistoricalPriceSnapshot(query, 'b', 'v', from!, to!, cutoff!)).rejects.toThrow('Instantánea inválida');
  }
  expect(query).not.toHaveBeenCalled();
  await expect(loadHistoricalEvaluationInputs(query, 'b', 'v', '2026-10-12')).rejects.toThrow('No hay valor real');
});
