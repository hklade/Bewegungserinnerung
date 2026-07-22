import assert from 'node:assert/strict';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

async function startServer() {
  const child = spawn(process.execPath, ['server.mjs'], {
    cwd: projectRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'test' },
  });

  child.stdout.on('data', (chunk) => {
    process.stdout.write(chunk);
  });

  child.stderr.on('data', (chunk) => {
    process.stderr.write(chunk);
  });

  await once(child, 'spawn');
  return child;
}

async function requestJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

async function waitForServer(url, timeoutMs = 5000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      await requestJson(url);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  throw new Error(`Server did not become ready at ${url}`);
}

test('server responds to the dashboard endpoint', async (t) => {
  const child = await startServer();

  t.after(async () => {
    child.kill('SIGTERM');
    await once(child, 'exit').catch(() => {});
  });

  await waitForServer('http://127.0.0.1:3001/api/dashboard?limit=1');
  const payload = await requestJson('http://127.0.0.1:3001/api/dashboard?limit=1');

  assert.ok(payload && typeof payload === 'object');
  assert.ok(Array.isArray(payload.latestBookings));
});
