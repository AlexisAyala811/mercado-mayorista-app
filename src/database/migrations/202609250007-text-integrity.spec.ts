import type { QueryRunner } from 'typeorm';

import { TextIntegrity1790294400007 } from './202609250007-text-integrity.js';

describe('TextIntegrity1790294400007', () => {
  it('adds and removes every check constraint reversibly', async () => {
    const query = vi.fn().mockResolvedValue(undefined);
    const runner = { query } as unknown as QueryRunner;
    const migration = new TextIntegrity1790294400007();

    await migration.up(runner);
    const additions = query.mock.calls.map(([sql]) => String(sql));
    expect(additions).toHaveLength(14);
    expect(additions).toContain(
      'ALTER TABLE "receptions" ADD CONSTRAINT "ck_receptions_driver_name_nonblank" CHECK (btrim("driver_name") <> \'\')',
    );

    query.mockClear();
    await migration.down(runner);
    expect(query).toHaveBeenCalledTimes(14);
    expect(
      query.mock.calls.every(([sql]) =>
        String(sql).includes('DROP CONSTRAINT'),
      ),
    ).toBe(true);
  });
});
