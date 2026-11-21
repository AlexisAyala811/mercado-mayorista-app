// End-to-end suites against PostgreSQL (spec 020). They share one database
// and each runs the migrations, so they run one at a time (--runInBand).
import { base } from './jest.config.mjs';

export default {
  ...base,
  rootDir: '.',
  testMatch: ['<rootDir>/test/**/*.e2e-spec.ts'],
  setupFiles: ['<rootDir>/test/database-setup.ts'],
  testTimeout: 60000,
};
