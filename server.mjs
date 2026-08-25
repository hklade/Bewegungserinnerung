const currentEnv = String(process.env.NODE_ENV ?? '').trim().toLowerCase();
if (currentEnv !== 'test') {
  process.env.NODE_ENV = 'production';
}

const { startServer } = await import('./server/http.mjs');

startServer();

// Node only flushes NODE_V8_COVERAGE data on an orderly exit; a bare SIGTERM/SIGINT
// terminates the process before that hook runs. Handle both explicitly so coverage
// survives Playwright's teardown (harmless no-op when NODE_V8_COVERAGE is unset).
if (process.env.NODE_V8_COVERAGE) {
  for (const signal of ['SIGTERM', 'SIGINT']) {
    process.on(signal, () => process.exit(0));
  }
}
