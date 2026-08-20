import { FullConfig } from "@playwright/test";
import { exec } from "child_process";
import fs from "fs";
import { testConfigFilePath } from "./global-setup";

const testConfigBackupPath = `${testConfigFilePath}.bak`;

// XXX Playwright-Kurs prüfen, ob es gebraucht wird

export default function globalTeardown(config: FullConfig) {
  /* Executed after all workers complete. Good place for cleanup tasks */
  console.log(`[INFO]: Starting the global teardown process (global-teardown.ts) ...`);

  // Restore the test config to its pre-run state — tests overwrite it via seedConfig()/restoreDefaultConfig()
  if (fs.existsSync(testConfigBackupPath)) {
    fs.copyFileSync(testConfigBackupPath, testConfigFilePath);
    fs.rmSync(testConfigBackupPath);
    console.log(`[INFO]: Restored ${testConfigFilePath} to its pre-run state`);
  }

  // Generate Allure report for local runs
  if (process.env.RUNNER?.toUpperCase() === "LOCAL") {
    console.log(" >> Local run detected - starting Allure server...");

    exec("allure serve", { shell: "cmd.exe" }, (error) => {
      if (error) {
        console.error("ERROR: Starting Allure server:", error.message);
      }
    });
  }

  console.log(`[INFO]: Completed the global teardown process (global-teardown.ts) ...`);
}
