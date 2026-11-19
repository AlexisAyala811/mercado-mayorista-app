import type { DataSource, EntityManager } from 'typeorm';

// Spec 017 (T1705): an in-memory EntityManager for service unit tests. Each
// entity class gets a list of rows; `where` matches by equality on the given
// fields. It covers what the services under test use and nothing more: the
// SQL itself is checked by the e2e tests on PostgreSQL.
type Row = Record<string, unknown>;
type Where = Row | Row[];

const matches = (row: Row, where: Where = {}) =>
  (Array.isArray(where) ? where : [where]).some((clause) =>
    Object.entries(clause).every(([key, value]) => row[key] === value),
  );

export function memoryManager(seed: Map<unknown, Row[]> = new Map()) {
  const tables = seed;
  const queries: { sql: string; parameters?: unknown[] }[] = [];
  let next = 1;
  const table = (entity: unknown) => {
    if (!tables.has(entity)) tables.set(entity, []);
    return tables.get(entity)!;
  };
  const repository = (entity: unknown) => ({
    create: (value: Row) => ({ ...value }),
    exists: async (options: { where?: Where }) => table(entity).some((row) => matches(row, options.where)),
    find: async (options: { where?: Where } = {}) => table(entity).filter((row) => matches(row, options.where)).map((row) => ({ ...row })),
    findAndCount: async (options: { where?: Where; skip?: number; take?: number } = {}) => {
      const rows = table(entity).filter((row) => matches(row, options.where));
      const start = options.skip ?? 0;
      return [rows.slice(start, start + (options.take ?? rows.length)), rows.length];
    },
    findOne: async (options: { where?: Where }) => {
      const row = table(entity).find((candidate) => matches(candidate, options.where));
      return row ? { ...row } : null;
    },
    save: async (value: Row) => {
      const rows = table(entity);
      const saved = { createdAt: new Date(), ...value, id: value.id ?? `id-${next++}` };
      const index = rows.findIndex((row) => row.id === saved.id);
      if (index >= 0) rows[index] = saved;
      else rows.push(saved);
      return { ...saved };
    },
    update: async (where: Row, changes: Row) => {
      let affected = 0;
      for (const row of table(entity))
        if (matches(row, where)) {
          Object.assign(row, changes);
          affected += 1;
        }
      return { affected };
    },
  });
  const manager = {
    getRepository: repository,
    query: async (sql: string, parameters?: unknown[]) => {
      queries.push({ sql, parameters });
      return [];
    },
  } as unknown as EntityManager;
  const dataSource = {
    transaction: async (work: (value: EntityManager) => Promise<unknown>) => work(manager),
  } as unknown as DataSource;
  return { dataSource, manager, queries, repository, rows: table };
}
