import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const serverV8Dir = path.join(rootDir, "coverage", "server-v8");
const clientRawDir = path.join(rootDir, ".nyc_output");

function run(cmd, args) {
  const result = spawnSync(cmd, args, {
    cwd: rootDir,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.error) {
    console.error(result.error);
  }
  return result.status ?? 1;
}

let exitCode = 0;

if (fs.existsSync(serverV8Dir) && fs.readdirSync(serverV8Dir).length > 0) {
  console.log("\n--- Server coverage report (server/*.mjs) ---");
  exitCode |= run("npx", [
    "c8",
    "report",
    "--temp-directory",
    serverV8Dir,
    "--reporter",
    "text",
    "--reporter",
    "html",
    "--report-dir",
    "coverage/server-html",
    "--include",
    "server/**",
    "--include",
    "shared/**",
    "--include",
    "server.mjs",
  ]);
  console.log("Server HTML report: coverage/server-html/index.html");
} else {
  console.log("No server coverage data found under coverage/server-v8 (run with COVERAGE=true).");
}

if (fs.existsSync(clientRawDir) && fs.readdirSync(clientRawDir).length > 0) {
  console.log("\n--- Client coverage report (src/*) ---");
  exitCode |= run("npx", [
    "nyc",
    "report",
    "--temp-dir",
    clientRawDir,
    "--reporter",
    "text",
    "--reporter",
    "html",
    "--report-dir",
    "coverage/client-html",
  ]);
  console.log("Client HTML report: coverage/client-html/index.html");
} else {
  console.log("No client coverage data found under .nyc_output (run with VITE_COVERAGE=true).");
}

process.exit(exitCode === 0 ? 0 : 1);
