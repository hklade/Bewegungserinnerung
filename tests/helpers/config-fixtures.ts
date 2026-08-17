// XXX Playwright-Kurs prüfen, ob es gebraucht wird

import { expect as baseExpect, test as base } from "@playwright/test";

export type EnvConfig = {
    envName: string;
    appURL: string;
    apiURL: string;
};

export const test = base.extend<EnvConfig>({
    envName: ["test", { option: true }],
    appURL: ["http://127.0.0.1:5173/", { option: true }],
    apiURL: ["http://127.0.0.1:3001/api", { option: true }],
});

export const expect = baseExpect;