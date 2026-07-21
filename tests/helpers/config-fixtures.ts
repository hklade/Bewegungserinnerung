// XXX Playwright-Kurs prüfen, ob es gebraucht wird


import { test as base } from "@playwright/test";

export type EnvConfig = {
    envName: string;
    appURL: string;
};

export const test = base.extend<EnvConfig>({
    // Define an option and provide a default value.
    // We can later override it in the config.
    envName: ["test", { option: true }],
    appURL: ["<provideURL>", { option: true }],
});