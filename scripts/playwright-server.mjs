import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentEnv = String(process.env.NODE_ENV ?? "").trim().toLowerCase();
if (currentEnv !== "test") {
  console.error(
    `[playwright-server] refusing to start: NODE_ENV must be "test" for e2e runs, but was "${process.env.NODE_ENV ?? ""}"`,
  );
  process.exit(1);
}

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = process.env.PLAYWRIGHT_PORT || "5173";
const host = process.env.PLAYWRIGHT_HOST || "127.0.0.1";

const api = spawn(process.execPath, ["server.mjs"], {
  cwd: projectRoot,
  stdio: "inherit",
  windowsHide: true,
});

let apiExited = false;
let viteExited = false;

const vite = spawn(
  process.platform === "win32" ? "cmd.exe" : "npm",
  process.platform === "win32"
    ? ["/d", "/s", "/c", `npm run dev -- --host ${host} --port ${port} --strictPort`]
    : ["run", "dev", "--", "--host", host, "--port", port, "--strictPort"],
  {
    cwd: projectRoot,
    stdio: "inherit",
    windowsHide: true,
  },
);

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

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

api.on("exit", (code) => {
  apiExited = true;
  if (code && code !== 0) {
    shutdown(code);
    return;
  }

  maybeShutdown(0);
});

vite.on("exit", (code) => {
  viteExited = true;
  if (code && code !== 0) {
    shutdown(code);
    return;
  }

  maybeShutdown(0);
});
