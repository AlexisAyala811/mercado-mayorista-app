// Jest for the backend (spec 020). NestJS 12 ships only ES modules, so Jest
// runs in native ESM mode (node --experimental-vm-modules) and SWC compiles
// TypeScript to ESM, keeping the decorator metadata Nest needs.
const swc = [
  '@swc/jest',
  {
    jsc: {
      parser: { syntax: 'typescript', decorators: true },
      transform: { legacyDecorator: true, decoratorMetadata: true },
      target: 'es2023',
      keepClassNames: true,
    },
    module: { type: 'es6' },
    sourceMaps: 'inline',
  },
];

/** Shared by the unit and e2e configurations. */
export const base = {
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  // Sources import siblings as './file.js' (NodeNext); Jest resolves the .ts.
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  transform: { '^.+\\.ts$': swc },
};

export default {
  ...base,
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/*.spec.ts', '<rootDir>/test/**/*.spec.ts'],
  setupFiles: ['<rootDir>/test/setup.ts'],
  // Sprint 2: coverage of every source file, tested or not, so files with no
  // test count as 0 % instead of being left out of the report.
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/main.ts',
    '!src/database/migrations/**',
    // Retired inventory service and DTO (CL-12); T1707 removes them.
    '!src/inventory/inventory.service.ts',
    '!src/inventory/http/adjust-inventory.dto.ts',
  ],
  coverageProvider: 'v8',
  coverageReporters: ['text-summary', 'json-summary', 'html'],
  coverageDirectory: './coverage',
};
