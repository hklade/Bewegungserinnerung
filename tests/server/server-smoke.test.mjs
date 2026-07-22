import assert from 'node:assert/strict';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

async function startServer() {
  const child = spawn(process.execPath, ['server.mjs'], {
    cwd: projectRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
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
  return response.json();
}

try {
  const child = await startServer();
  try {
    const payload = await requestJson('http://127.0.0.1:3001/api/dashboard?limit=1');
    assert.ok(payload && typeof payload === 'object');
    assert.ok(Array.isArray(payload.latestBookings));
  } finally {
    child.kill('SIGTERM');
    await once(child, 'exit').catch(() => {});
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
