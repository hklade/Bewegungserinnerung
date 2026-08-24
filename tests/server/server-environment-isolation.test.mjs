import assert from 'node:assert/strict';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

async function collectStartupLog(env) {
  const { NODE_ENV: _dropped, ...inheritedEnv } = process.env;
  const child = spawn(process.execPath, ['server.mjs'], {
    cwd: projectRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...inheritedEnv, ...env },
  });

  let output = '';
  child.stdout.on('data', (chunk) => {
    output += chunk;
  });
  child.stderr.on('data', (chunk) => {
    output += chunk;
  });

  await once(child, 'spawn');
  await new Promise((resolve) => setTimeout(resolve, 500));

  child.kill('SIGTERM');
  await once(child, 'exit').catch(() => {});

  return output;
}

test('server.mjs logs production environment when NODE_ENV is unset', async () => {
  const output = await collectStartupLog({});

  assert.match(output, /environment=production/);
  assert.match(output, /bewegungserinnerung\.config\.json/);
  assert.doesNotMatch(output, /Test-Bewegungsdaten\.csv/);
});

test('server.mjs forces production environment when NODE_ENV is an unrecognized value', async () => {
  const output = await collectStartupLog({ NODE_ENV: 'test-leaked-from-shell-but-not-test' });

  assert.match(output, /environment=production/);
});

test('server.mjs logs test environment when NODE_ENV=test', async () => {
  const output = await collectStartupLog({ NODE_ENV: 'test' });

  assert.match(output, /environment=test/);
  assert.match(output, /Test-Bewegungsdaten\.csv/);
});
