// XXX Playwright-Kurs prüfen, ob es gebraucht wird

import { expect as baseExpect, test as base } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export type EnvConfig = {
    envName: string;
    appURL: string;
    apiURL: string;
};

const coverageOutDir = path.resolve(process.cwd(), ".nyc_output");

export const test = base.extend<EnvConfig>({
    envName: ["test", { option: true }],
    appURL: ["http://127.0.0.1:5173/", { option: true }],
    apiURL: ["http://127.0.0.1:3001/api", { option: true }],

    // Sammelt Istanbul-Client-Coverage (window.__coverage__) nach jedem Test,
    // sofern der Browser-Kontext instrumentierten Code geladen hat (VITE_COVERAGE=true).
    page: async ({ page }, use) => {
        await use(page);

        if (process.env.VITE_COVERAGE !== "true") {
            return;
        }

        const coverage = await page.evaluate(() => (window as any).__coverage__).catch(() => undefined);
        if (!coverage) {
            return;
        }

        fs.mkdirSync(coverageOutDir, { recursive: true });
        const fileName = `playwright_${crypto.randomUUID()}.json`;
        fs.writeFileSync(path.join(coverageOutDir, fileName), JSON.stringify(coverage));
    },
});

export const expect = baseExpect;