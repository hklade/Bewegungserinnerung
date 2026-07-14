import { spawnSync } from "node:child_process";

const rootDir = process.cwd();

const testRun = spawnSync("npx", ["playwright", "test"], {
  cwd: rootDir,
  stdio: "inherit",
  shell: process.platform === "win32",
});

const reportRun = spawnSync(
  "npx",
  ["allure", "generate", "allure-results", "--clean", "-o", "allure-report"],
  {
    cwd: rootDir,
    stdio: "inherit",
    shell: process.platform === "win32",
  },
);

if (testRun.error) {
  console.error(testRun.error);
}

if (reportRun.error) {
  console.error(reportRun.error);
}

process.exit(testRun.status ?? 1);