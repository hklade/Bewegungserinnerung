import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

test('loadConfig uses the test config when NODE_ENV is test', async () => {
  assert.equal(process.env.NODE_ENV, 'test');

  const { loadConfig } = await import('../../server/config.mjs');
  const config = loadConfig(() => {});

  assert.equal(config.reminderStartTime, '07:55');
  assert.equal(config.exportPath, path.join(projectRoot, 'data', 'Test-Bewegungsdaten.csv'));
});

test('saveConfig falls back to the test export path, not the production one, when exportPath is omitted', async (t) => {
  assert.equal(process.env.NODE_ENV, 'test');

  const fs = await import('node:fs');
  const { loadConfig, saveConfig, SERVER_PATHS } = await import('../../server/config.mjs');

  const configBefore = fs.readFileSync(SERVER_PATHS.testConfigFile, 'utf8');
  t.after(() => {
    fs.writeFileSync(SERVER_PATHS.testConfigFile, configBefore, 'utf8');
  });

  const currentConfig = loadConfig(() => {});
  const { exportPath: _omitted, ...configWithoutExportPath } = currentConfig;
  const saved = saveConfig(configWithoutExportPath, () => {});

  assert.equal(saved.exportPath, SERVER_PATHS.testExportPath);
});
