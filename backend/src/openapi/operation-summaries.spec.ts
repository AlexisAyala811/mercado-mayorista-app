import { readFileSync } from 'node:fs';

import type { OpenAPIObject } from '@nestjs/swagger';

import { applyOperationSummaries, operationSummaries } from './operation-summaries.js';

// Sprint 2: the exported contract in docs/api/openapi.json must describe every
// operation. Regenerate it with the API running (see docs/api/README.md).
describe('OpenAPI summaries', () => {
  const document = JSON.parse(
    readFileSync(new URL('../../../docs/api/openapi.json', import.meta.url), 'utf8'),
  ) as OpenAPIObject;

  it('has a summary for every operation of the exported contract', () => {
    expect(applyOperationSummaries(structuredClone(document))).toEqual([]);
  });

  it('keeps no summary for an operation that no longer exists', () => {
    const ids = new Set(
      Object.values(document.paths).flatMap((operations) =>
        Object.values(operations as Record<string, { operationId?: string }>).map((operation) => operation.operationId),
      ),
    );
    expect(Object.keys(operationSummaries).filter((id) => !ids.has(id))).toEqual([]);
  });

  it('marks every retired inventory route as deprecated with its 410 answer (spec 021)', () => {
    const retired = Object.entries(document.paths)
      .filter(([path]) => path.startsWith('/api/v1/inventory'))
      .flatMap(([, operations]) =>
        Object.values(operations as Record<string, { deprecated?: boolean; responses?: Record<string, unknown> }>),
      );
    expect(retired).toHaveLength(4);
    for (const operation of retired) {
      expect(operation.deprecated).toBe(true);
      expect(operation.responses).toHaveProperty('410');
    }
  });

  it('reports an operation without a summary', () => {
    const extra = { paths: { '/x': { get: { operationId: 'NewController_x', responses: {} } } } } as unknown as OpenAPIObject;
    expect(applyOperationSummaries(extra)).toEqual(['NewController_x']);
  });
});
