import { spawnSync } from "node:child_process";

const rootDir = process.cwd();

const testRun = spawnSync("node", ["--test", "--test-concurrency=1", "tests/server/*.test.mjs"], {
  cwd: rootDir,
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, NODE_ENV: "test", TZ: "Europe/Vienna" },
});

if (testRun.error) {
  console.error(testRun.error);
}

process.exit(testRun.status ?? 1);
