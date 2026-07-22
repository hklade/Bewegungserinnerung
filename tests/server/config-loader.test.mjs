import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

process.env.NODE_ENV = 'test';

const { loadConfig } = await import('../../server/config.mjs');
const config = loadConfig(() => {});

assert.equal(config.reminderStartTime, '07:55');
assert.equal(config.exportPath, path.join(projectRoot, 'data', 'Test-Bewegungsdaten.csv'));
