import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.CI_PORT || 4173);
const PYTHON_CMD = process.platform === 'win32' ? 'python' : 'python3';

export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.spec\.mjs$/,
  timeout: 45_000,
  expect: {
    timeout: 8_000,
  },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]]
    : [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: `${PYTHON_CMD} tests/csp-server.py --host 127.0.0.1 --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}/index.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 20_000,
    env: {
      CSP_SERVER_QUIET: '1',
    },
  },
});
