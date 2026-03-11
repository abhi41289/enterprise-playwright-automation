/**
 * @file fixtures/index.ts
 * @purpose Defines custom Playwright fixtures for the test suite.
 *          Fixtures replace beforeEach hooks — they compose cleanly and are scoped automatically.
 * @pattern Fixture composition — each fixture is a single concern; tests declare exactly what they need.
 */

import { test as base, expect } from '@playwright/test';
import { type Page } from '@playwright/test';
import { ApiClient } from '../helpers/ApiClient';
import { TestDataFactory } from '../helpers/TestDataFactory';
import { type AuthResponse } from '../data/types';

// ─── Constants ─────────────────────────────────────────────────────────────────

/** Restful-Booker base URL, sourced from environment or defaulted to the public instance. */
const API_BASE_URL = process.env['API_BASE_URL'] ?? 'https://restful-booker.herokuapp.com';

/** SauceDemo base URL, sourced from environment or defaulted to the public instance. */
const SAUCE_BASE_URL = process.env['BASE_URL'] ?? 'https://www.saucedemo.com';

// ─── Fixture type declarations ─────────────────────────────────────────────────

/**
 * Describes the shape of all custom fixtures.
 *
 * - `apiClient`    — A pre-configured `ApiClient` bound to `API_BASE_URL`.
 * - `authToken`    — A valid Restful-Booker session token obtained via `POST /auth`.
 * - `loggedInPage` — A `Page` that has already completed the SauceDemo login flow.
 *
 * SOLID principles satisfied:
 *
 * SRP — Single Responsibility Principle:
 *   Each fixture has exactly one responsibility: setting up and tearing down a single
 *   concern (`apiClient` → HTTP transport, `authToken` → API authentication,
 *   `loggedInPage` → UI session).  Tests declare only the fixtures they require.
 *
 * DIP — Dependency Inversion Principle:
 *   Fixtures depend on abstractions (`APIRequestContext`, `Page`) injected by Playwright's
 *   fixture system, not on concrete implementations.  Consumers (test files) are equally
 *   decoupled — they receive typed values, not raw browser handles.
 *
 * ISP — Interface Segregation Principle:
 *   `Fixtures` is split into three independent properties.  A UI test need not receive
 *   `authToken`; an API test need not receive `loggedInPage`.  Each test imports only
 *   the slice of the fixture surface it actually uses.
 */
interface Fixtures {
  /** Pre-configured HTTP client bound to `API_BASE_URL`. */
  apiClient: ApiClient;

  /**
   * Valid Restful-Booker bearer token obtained by calling `POST /auth`.
   * Fails the test with a descriptive message if authentication is unsuccessful.
   */
  authToken: string;

  /**
   * A Playwright `Page` that has navigated to SauceDemo and completed login
   * as the `standard_user`.  Ready for product/cart/checkout interactions.
   */
  loggedInPage: Page;
}

// ─── Extended test object ──────────────────────────────────────────────────────

/**
 * The extended Playwright `test` object with custom fixtures attached.
 * Import this as `test` in all spec files — it is a drop-in replacement for
 * Playwright's built-in `test`.
 */
export const test = base.extend<Fixtures>({
  /**
   * `apiClient` fixture — scoped to each test.
   *
   * Wraps Playwright's built-in `request` fixture (an `APIRequestContext`) with
   * the typed `ApiClient` abstraction.  No teardown is required — Playwright
   * disposes `request` automatically after each test.
   */
  apiClient: async ({ request }, use) => {
    const client = new ApiClient(request, API_BASE_URL);
    await use(client);
  },

  /**
   * `authToken` fixture — scoped to each test.
   *
   * Calls `POST /auth` on Restful-Booker using the `apiClient` fixture.
   * Fails the test immediately and clearly if:
   * - The HTTP call returns a non-2xx status.
   * - The response body does not contain a valid `token` string.
   *
   * Depends on: `apiClient`.
   */
  authToken: async ({ apiClient }, use) => {
    const result = await apiClient.post<AuthResponse>('/auth', {
      username: process.env['BOOKER_ADMIN_USER'] ?? 'admin',
      password: process.env['BOOKER_ADMIN_PASS'] ?? 'password123',
    });

    if (!result.ok) {
      throw new Error(
        `authToken fixture: POST /auth failed with status ${result.status} — ${result.error}. ` +
          `Verify BOOKER_ADMIN_USER and BOOKER_ADMIN_PASS environment variables.`,
      );
    }

    const { token } = result.data;

    // On credential failure the API returns { reason: "Bad credentials" } not { token }.
    // The guard below catches both: missing token and the reason-field failure shape.
    if (typeof token !== 'string' || token.length === 0) {
      const reason = result.data.reason ?? 'unknown';
      throw new Error(
        `authToken fixture: POST /auth returned no token. ` +
          `API reason: "${reason}". Verify BOOKER_ADMIN_USER / BOOKER_ADMIN_PASS env vars.`,
      );
    }

    await use(token);
  },

  /**
   * `loggedInPage` fixture — scoped to each test.
   *
   * 1. Navigates the Playwright `page` to `SAUCE_BASE_URL` (the SauceDemo root).
   * 2. Fills and submits the login form using `standard_user` credentials from
   *    `TestDataFactory` (which itself honours `process.env` overrides).
   * 3. Waits for the inventory page URL to confirm a successful login before
   *    handing the page to the test.
   *
   * No teardown is required — Playwright's built-in `page` fixture handles browser cleanup.
   */
  loggedInPage: async ({ page }, use) => {
    const user = TestDataFactory.create('standard');

    await page.goto(SAUCE_BASE_URL);

    // Fill credentials using Playwright auto-waiting — no explicit waits needed
    await page.locator('[data-test="username"]').fill(user.username);
    await page.locator('[data-test="password"]').fill(user.password);
    await page.locator('[data-test="login-button"]').click();

    // Wait for navigation to the inventory page to confirm a successful login
    await page.waitForURL('**/inventory.html', { waitUntil: 'domcontentloaded' });

    await use(page);
  },
});

// ─── Exports ───────────────────────────────────────────────────────────────────

/**
 * Named export: allows `import { test } from '../fixtures'` in spec files.
 * The `export const test = ...` above already provides the named export; this
 * re-declaration is an alias for documentation clarity only — it points to the
 * same binding.
 */
export default test;

/**
 * Re-export Playwright's `expect` so spec files can source both `test` and `expect`
 * from the single `'../fixtures'` path — no mixed imports required.
 *
 * @example
 * import { test, expect } from '../fixtures';
 */
export { expect };
