/**
 * @file pages/LoginPage.ts
 * @purpose Page object for the SauceDemo login screen (`https://www.saucedemo.com/`).
 *          Encapsulates all login-related interactions and assertions so test files
 *          never touch raw selectors or low-level Playwright calls for this screen.
 * @pattern Page Object Model (POM) — one class per logical page/screen, exposing
 *          intention-revealing methods that read like business-level steps.
 */

import { type Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { type SauceUser } from '../data/types';

/**
 * SOLID principles satisfied:
 *
 * SRP — Single Responsibility Principle:
 *   LoginPage owns one concern: the SauceDemo login screen. It knows nothing
 *   about inventory, cart, or checkout — those live in dedicated page objects.
 *
 * OCP — Open/Closed Principle:
 *   New login variants (e.g. OAuth, SSO) are added by extending BasePage in a
 *   separate class, not by modifying LoginPage.
 *
 * LSP — Liskov Substitution Principle:
 *   LoginPage is substitutable for BasePage wherever a BasePage reference is
 *   expected — it does not weaken any inherited contract.
 */
export class LoginPage extends BasePage {
  // ─── Selector Constants ────────────────────────────────────────────────────
  private readonly USERNAME_INPUT = '[data-test="username"]';
  private readonly PASSWORD_INPUT = '[data-test="password"]';
  private readonly LOGIN_BUTTON = '[data-test="login-button"]';
  private readonly ERROR_MESSAGE = '[data-test="error"]';

  /** The root path of the SauceDemo application — the login screen. */
  private readonly LOGIN_PATH = '/';

  /**
   * @param page - Playwright `Page` instance injected by the test fixture.
   */
  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigates to the SauceDemo root URL (login screen).
   * Useful in `beforeEach` hooks to guarantee a clean starting state.
   */
  async goto(): Promise<void> {
    await this.navigateTo(this.LOGIN_PATH);
  }

  /**
   * Fills the username and password fields, then clicks the login button.
   * Playwright auto-waits for each element to be actionable before interacting.
   *
   * @param username - Plain-text username string.
   * @param password - Plain-text password string.
   */
  async login(username: string, password: string): Promise<void> {
    await this.page.locator(this.USERNAME_INPUT).fill(username);
    await this.page.locator(this.PASSWORD_INPUT).fill(password);
    await this.page.locator(this.LOGIN_BUTTON).click();
  }

  /**
   * Convenience overload that accepts a typed `SauceUser` from `data/types.ts`.
   * Delegates to `login()` so credential handling remains in one place.
   *
   * @param user - A `SauceUser` discriminated-union value from the data layer.
   */
  async loginAs(user: SauceUser): Promise<void> {
    await this.login(user.username, user.password);
  }

  /**
   * Asserts that the error message banner is visible and contains the expected text.
   * Uses `toContainText` rather than strict equality to be resilient to minor copy changes.
   *
   * @param expectedText - Substring expected to appear inside the error container.
   */
  async assertLoginError(expectedText: string): Promise<void> {
    await expect(this.page.locator(this.ERROR_MESSAGE)).toContainText(expectedText);
  }

  /**
   * Asserts that the browser has navigated to the inventory page after a
   * successful login. Uses URL matching — the most reliable signal that the
   * login flow completed without relying on page content that could change.
   */
  async assertLoggedIn(): Promise<void> {
    await expect(this.page).toHaveURL(/\/inventory/);
  }
}
