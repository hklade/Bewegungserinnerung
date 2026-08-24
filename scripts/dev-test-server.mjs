import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const api = spawn(process.execPath, ['server.mjs'], {
  cwd: projectRoot,
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'test' },
});

const vite = spawn(
  process.platform === 'win32' ? 'npm.cmd' : 'npm',
  ['run', 'dev'],
  {
    cwd: projectRoot,
    stdio: 'inherit',
  },
);

let apiExited = false;
let viteExited = false;

const shutdown = (code = 0) => {
  if (!api.killed) {
    api.kill();
  }
  if (!vite.killed) {
    vite.kill();
  }
  process.exit(code);
};

const maybeShutdown = (code = 0) => {
  if (apiExited && viteExited) {
    shutdown(code);
  }
};

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

api.on('exit', (code) => {
  apiExited = true;
  if (code && code !== 0) {
    shutdown(code);
    return;
  }
  maybeShutdown(0);
});

vite.on('exit', (code) => {
  viteExited = true;
  if (code && code !== 0) {
    shutdown(code);
    return;
  }
  maybeShutdown(0);
});
