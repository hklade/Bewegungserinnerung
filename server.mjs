const currentEnv = String(process.env.NODE_ENV ?? '').trim().toLowerCase();
if (currentEnv !== 'test') {
  process.env.NODE_ENV = 'production';
}

const { startServer } = await import('./server/http.mjs');

startServer();
