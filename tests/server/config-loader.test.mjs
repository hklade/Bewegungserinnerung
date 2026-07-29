import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

test('loadConfig uses the test config when NODE_ENV is test', async (t) => {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';

  t.after(() => {
    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }
  });

  const { loadConfig } = await import('../../server/config.mjs');
  const config = loadConfig(() => {});

  assert.equal(config.reminderStartTime, '07:55');
  assert.equal(config.exportPath, path.join(projectRoot, 'data', 'Test-Bewegungsdaten.csv'));
});
