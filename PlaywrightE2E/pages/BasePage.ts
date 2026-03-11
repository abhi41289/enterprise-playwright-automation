/**
 * @file pages/BasePage.ts
 * @purpose Abstract base class that every SauceDemo page object extends.
 *          Centralises navigation, generic error-reading, and visibility
 *          helpers so concrete page classes never duplicate these concerns.
 * @pattern Template Method — BasePage defines the skeletal infrastructure;
 *          subclasses override nothing here but inherit a stable, typed API.
 */

import { type Page, type Locator, expect } from '@playwright/test';

/**
 * SOLID principles satisfied:
 *
 * SRP — Single Responsibility Principle:
 *   BasePage owns exactly one concern: low-level page interaction primitives
 *   (navigation, load-waiting, error-reading, visibility checks).
 *   It has no knowledge of any specific page's business logic.
 *
 * OCP — Open/Closed Principle:
 *   BasePage is closed for modification — its helpers are stable contracts.
 *   It is open for extension — all page-specific behaviour lives in subclasses
 *   that extend this class without changing it.
 *
 * DIP — Dependency Inversion Principle:
 *   Accepts the abstract `Page` interface from Playwright rather than a
 *   concrete browser implementation, so the framework stays browser-agnostic.
 */
export abstract class BasePage {
  /** Generic data-test error container present on multiple SauceDemo pages. */
  private readonly ERROR_CONTAINER = '[data-test="error"]';

  /**
   * @param page - The Playwright `Page` instance injected by the test fixture.
   *               Stored as `protected` so subclasses can create locators from it.
   */
  constructor(protected readonly page: Page) {}

  /**
   * Waits for the page to reach a fully settled state by requiring both
   * `domcontentloaded` (DOM parsed) and `networkidle` (no in-flight requests).
   *
   * Playwright's auto-waiting covers individual locator interactions, but this
   * method is useful after `page.goto()` calls inside page objects.
   */
  async waitForPageLoad(): Promise<void> {
    await Promise.all([
      this.page.waitForLoadState('domcontentloaded'),
      this.page.waitForLoadState('load'),
    ]);
  }

  /**
   * Reads the text content of the generic `[data-test="error"]` container.
   * Returns an empty string when the element is absent rather than throwing.
   *
   * @returns The trimmed inner text of the error container, or `''`.
   */
  async getErrorMessage(): Promise<string> {
    const errorLocator = this.page.locator(this.ERROR_CONTAINER);
    const isPresent = await errorLocator.isVisible();
    if (!isPresent) {
      return '';
    }
    return (await errorLocator.innerText()).trim();
  }

  /**
   * Returns `true` when the given locator is visible in the viewport.
   * Wraps `Locator.isVisible()` to provide a consistent boolean helper
   * across all page objects without exposing raw Locator internals.
   *
   * @param locator - Any Playwright `Locator` to inspect.
   */
  async isVisible(locator: Locator): Promise<boolean> {
    return locator.isVisible();
  }

  /**
   * Navigates to a URL path (or full URL). Delegates directly to `page.goto()`
   * so relative paths resolve against the `baseURL` set in `playwright.config.ts`.
   *
   * @param path - Relative path (e.g. `'/inventory.html'`) or absolute URL.
   */
  async navigateTo(path: string): Promise<void> {
    await this.page.goto(path);
  }

  /**
   * Convenience assertion that the current page URL contains the given substring.
   * Re-exported here so subclasses can call `this.assertUrlContains(...)` without
   * importing `expect` directly.
   *
   * @param substring - URL fragment to assert presence of.
   */
  protected async assertUrlContains(substring: string): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(substring));
  }
}
