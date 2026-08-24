import assert from 'node:assert/strict';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');
const scriptPath = path.join(projectRoot, 'scripts', 'playwright-server.mjs');

async function runGuard(env) {
  const { NODE_ENV: _dropped, ...inheritedEnv } = process.env;
  const child = spawn(process.execPath, [scriptPath], {
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

  const [code] = await once(child, 'exit');
  return { code, output };
}

test('playwright-server.mjs fails fast when NODE_ENV is not test', async () => {
  const { code, output } = await runGuard({});

  assert.notEqual(code, 0);
  assert.match(output, /NODE_ENV/);
  assert.match(output, /test/);
});
