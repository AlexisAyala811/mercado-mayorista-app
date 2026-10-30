export function assertDatabaseTestEnvironment(environment: NodeJS.ProcessEnv) {
  if (
    environment.RUN_DATABASE_E2E !== 'true' ||
    environment.NODE_ENV !== 'test' ||
    !environment.DATABASE_NAME?.toLowerCase().includes('test')
  ) {
    throw new Error(
      'Database E2E requires RUN_DATABASE_E2E=true, NODE_ENV=test and a DATABASE_NAME containing "test". No database connection was attempted.',
    );
  }
}
