import { spawnSync } from "node:child_process";

// --headed braucht ein echtes Display. Auf Linux ohne DISPLAY (z. B. im
// Devcontainer) gibt es keins, aber xvfb-run kann eins virtuell bereitstellen.
// Auf anderen Plattformen (Windows) oder wenn bereits ein DISPLAY existiert,
// läuft der Playwright-Aufruf unverändert direkt durch.
const needsVirtualDisplay = process.platform === "linux" && !process.env.DISPLAY;

const command = needsVirtualDisplay ? "xvfb-run" : "npx";
const args = needsVirtualDisplay
  ? ["--auto-servernum", "npx", "playwright", "test", "--config", "config/test.playwright.config.ts", "--headed"]
  : ["playwright", "test", "--config", "config/test.playwright.config.ts", "--headed"];

const result = spawnSync(command, args, {
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.error) {
  console.error(result.error);
}

process.exit(result.status ?? 1);
