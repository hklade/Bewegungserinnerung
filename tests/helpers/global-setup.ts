import { type FullConfig } from "@playwright/test";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// XXX Playwright-Kurs prüfen, ob es gebraucht wird

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
export const testConfigFilePath = path.join(repoRoot, "config", "test-bewegungserinnerung.config.json");
const testConfigBackupPath = `${testConfigFilePath}.bak`;

export default async function globalSetup(config: FullConfig) {
    console.log(`[INFO]: Starting the global setup (global-setup.ts) ...`);

    if (fs.existsSync(testConfigFilePath)) {
        fs.copyFileSync(testConfigFilePath, testConfigBackupPath);
        console.log(`[INFO]: Backed up ${testConfigFilePath} before the test run`);
    }

    if (process.env.RUNNER?.toUpperCase() === "LOCAL") {
        console.log(`[INFO]: Detecting local runs..`);

        // Delete allure results
        /* const resultsDir = path.resolve(process.cwd(), "allure-results");
        console.log(`>> resultsDir: ${resultsDir}`);

        if (fs.existsSync(resultsDir)) {
            fs.rmSync(resultsDir, { recursive: true, force: true });
            console.log(`[INFO]: Allure results deleted for local run`);
        } */
    }
    console.log(`[INFO]: Completed the global setup (global-setup.ts) ...`);

    // All other one-off tasks go here...

    // Set the login cookie global variable
    process.env.LOGIN_COOKIES = undefined
}
