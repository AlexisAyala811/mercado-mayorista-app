import type {
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';

import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  it('reports the process as alive without requiring the database', () => {
    const controller = new HealthController(
      {} as HealthCheckService,
      {} as TypeOrmHealthIndicator,
    );

    expect(controller.live()).toEqual({ status: 'ok' });
  });
});
