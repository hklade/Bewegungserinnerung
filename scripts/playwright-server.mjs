import { spawn } from "node:child_process";

const projectRoot = process.cwd();

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
    ? ["/d", "/s", "/c", "npm run dev -- --host 127.0.0.1 --port 5173 --strictPort"]
    : ["run", "dev", "--", "--host", "127.0.0.1", "--port", "5173", "--strictPort"],
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
