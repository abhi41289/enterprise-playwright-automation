/**
 * @file playwright.config.ts
 * @purpose Central Playwright configuration for the enterprise automation framework.
 * @pattern Configuration Object — single source of truth for test behaviour,
 *          browsers, base URLs, timeouts, reporters, and artifact retention.
 *
 * Key decisions:
 * - dotenv loaded here so all test files can access process.env without extra boilerplate.
 * - Trace/video/screenshot captured only on failure to keep CI artifact size manageable.
 * - Separate projects for UI (Chromium/Firefox/WebKit) and API (Chromium, one browser is
 *   sufficient since API tests are browser-agnostic).
 */

import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load environment variables from .env file (ignored by git, see .gitignore)
dotenv.config();

const BASE_URL = process.env['BASE_URL'] ?? 'https://www.saucedemo.com';
const API_BASE_URL = process.env['API_BASE_URL'] ?? 'https://restful-booker.herokuapp.com';

export { BASE_URL, API_BASE_URL };

export default defineConfig({
  // Root directory for test discovery
  testDir: './tests',

  // Fail the build on CI if tests are accidentally left in .only mode
  forbidOnly: !!process.env['CI'],

  // Retry once on CI to filter flaky tests; no retries locally for faster feedback
  retries: process.env['CI'] ? 1 : 0,

  // Parallelism — use 4 workers on CI, default (CPU count) locally.
  // Conditional spread required: exactOptionalPropertyTypes disallows assigning undefined
  // to an optional property whose type does not include undefined.
  ...(process.env['CI'] ? { workers: 4 } : {}),

  // Reporters: HTML for local review; list for CI stdout readability
  reporter: process.env['CI']
    ? [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]]
    : [['html', { open: 'on-failure', outputFolder: 'playwright-report' }]],

  // Global defaults shared across all test files
  use: {
    // Capture trace on first retry only — balances debuggability vs disk usage
    trace: 'on-first-retry',
    // Video on failure only
    video: 'retain-on-failure',
    // Screenshot on failure only
    screenshot: 'only-on-failure',
    // Viewport consistent with most desktop scenarios
    viewport: { width: 1280, height: 720 },
    // Action timeout — time for a single Playwright action (click, fill, etc.)
    actionTimeout: 10_000,
    // Navigation timeout — time for page.goto() and similar
    navigationTimeout: 30_000,
  },

  // Global test timeout (includes all beforeAll/beforeEach/test/afterEach/afterAll)
  timeout: 60_000,

  // Expect (assertion) timeout
  expect: {
    timeout: 10_000,
  },

  // Test projects — distinct configurations for different test layers
  projects: [
    // ── UI Tests ───────────────────────────────────────────────────────────────
    {
      name: 'ui-chromium',
      testMatch: ['tests/e2e/**/*.spec.ts', 'tests/visual/**/*.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        baseURL: BASE_URL,
      },
    },
    {
      name: 'ui-firefox',
      testMatch: ['tests/e2e/**/*.spec.ts'],
      use: {
        ...devices['Desktop Firefox'],
        baseURL: BASE_URL,
      },
    },
    {
      name: 'ui-webkit',
      testMatch: ['tests/e2e/**/*.spec.ts'],
      use: {
        ...devices['Desktop Safari'],
        baseURL: BASE_URL,
      },
    },

    // ── API Tests ──────────────────────────────────────────────────────────────
    // API tests don't need a real browser; running on one engine is sufficient.
    {
      name: 'api',
      testMatch: 'tests/api/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: API_BASE_URL,
      },
    },
  ],

  // Output directory for test artifacts (screenshots, videos, traces)
  outputDir: 'test-results/',
});
