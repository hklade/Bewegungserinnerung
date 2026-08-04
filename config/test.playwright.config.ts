import { defineConfig } from '@playwright/test';
import { baseConfig } from '../playwright.config';
import type { EnvConfig } from '../tests/helpers/config-fixtures';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('test.playwright.config.ts');

export default defineConfig<EnvConfig>({
    ...baseConfig,
    testDir: path.resolve(__dirname, '../tests'),
    use: {
        ...baseConfig.use,
        envName: 'test',
        appURL: 'http://127.0.0.1:5174/',
        apiURL: 'http://127.0.0.1:3001/api',
    },
    globalSetup: path.resolve(__dirname, '../tests/helpers/global-setup.ts'),
    globalTeardown: path.resolve(__dirname, '../tests/helpers/global-teardown.ts'),
    webServer: {
        ...baseConfig.webServer,
        env: {
            ...(baseConfig.webServer?.env ?? {}),
            PLAYWRIGHT_PORT: '5174',
            PLAYWRIGHT_HOST: '127.0.0.1',
        },
        url: 'http://127.0.0.1:5174',
    },
});