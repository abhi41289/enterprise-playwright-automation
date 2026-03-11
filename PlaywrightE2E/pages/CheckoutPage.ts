/**
 * @file pages/CheckoutPage.ts
 * @purpose Page object covering all three SauceDemo checkout screens:
 *          step one (`/checkout-step-one.html` — shipping info),
 *          step two (`/checkout-step-two.html` — order review), and
 *          the completion confirmation (`/checkout-complete.html`).
 *
 *          A single class is used because the three screens form one unbroken
 *          user journey — splitting them into three classes would require tests
 *          to juggle object lifetimes mid-flow, adding complexity with no benefit.
 * @pattern Page Object Model (POM) — all checkout interaction detail is hidden
 *          behind intention-revealing public methods that map to business steps.
 */

import { type Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { type CheckoutInfo } from '../data/types';

/**
 * SOLID principles satisfied:
 *
 * SRP — Single Responsibility Principle:
 *   CheckoutPage owns one concern: the multi-step checkout journey.
 *   Cart item management lives in CartPage; login lives in LoginPage.
 *
 * OCP — Open/Closed Principle:
 *   New checkout steps or alternative completion flows are added by extending
 *   or composing — not by modifying this class.
 *
 * LSP — Liskov Substitution Principle:
 *   Fully substitutable for BasePage; no inherited postcondition is weakened.
 *
 * DIP — Dependency Inversion Principle:
 *   Accepts `CheckoutInfo` (a stable domain type) rather than raw strings,
 *   decoupling callers from field-level implementation details.
 */
export class CheckoutPage extends BasePage {
  // ─── Selector Constants — Step One ────────────────────────────────────────
  private readonly FIRST_NAME_INPUT = '[data-test="firstName"]';
  private readonly LAST_NAME_INPUT = '[data-test="lastName"]';
  private readonly POSTAL_CODE_INPUT = '[data-test="postalCode"]';
  private readonly CONTINUE_BUTTON = '[data-test="continue"]';

  // ─── Selector Constants — Step Two ────────────────────────────────────────
  private readonly FINISH_BUTTON = '[data-test="finish"]';
  private readonly SUMMARY_TOTAL = '.summary_total_label';

  // ─── Selector Constants — Completion ──────────────────────────────────────
  private readonly COMPLETE_HEADER = '.complete-header';

  // ─── Selector Constants — Shared ──────────────────────────────────────────
  private readonly ERROR_BANNER = '[data-test="error"]';

  /** Text expected inside the completion header — asserted in `assertOrderComplete`. */
  private readonly ORDER_COMPLETE_TEXT = 'Thank you';

  /**
   * @param page - Playwright `Page` instance injected by the test fixture.
   */
  constructor(page: Page) {
    super(page);
  }

  /**
   * Fills the shipping information form on checkout step one.
   * Uses the typed `CheckoutInfo` domain object from `data/types.ts` to ensure
   * callers provide all required fields without relying on positional arguments.
   *
   * @param info - Shipping details: first name, last name, and postal code.
   */
  async fillShippingInfo(info: CheckoutInfo): Promise<void> {
    await this.page.locator(this.FIRST_NAME_INPUT).fill(info.firstName);
    await this.page.locator(this.LAST_NAME_INPUT).fill(info.lastName);
    await this.page.locator(this.POSTAL_CODE_INPUT).fill(info.postalCode);
  }

  /**
   * Clicks the "Continue" button on step one to advance to the order-review screen.
   * Asserts navigation to step two as a guard so subsequent method calls
   * fail with a meaningful error if the form submission was rejected.
   */
  async continueToReview(): Promise<void> {
    await this.page.locator(this.CONTINUE_BUTTON).click();
    await expect(this.page).toHaveURL(/\/checkout-step-two/);
  }

  /**
   * Returns the full text of the order summary total label on step two
   * (e.g. `"Total: $43.18"`). The raw string is returned so callers can
   * parse or assert it according to their specific needs.
   */
  async getSummaryTotal(): Promise<string> {
    const label = this.page.locator(this.SUMMARY_TOTAL);
    await expect(label).toBeVisible();
    return (await label.innerText()).trim();
  }

  /**
   * Clicks the "Finish" button on the order-review screen to submit the order.
   * Asserts navigation to the completion page as a guard.
   */
  async finishCheckout(): Promise<void> {
    await this.page.locator(this.FINISH_BUTTON).click();
    await expect(this.page).toHaveURL(/\/checkout-complete/);
  }

  /**
   * Asserts that the order-complete confirmation screen is displayed and contains
   * the expected "Thank you" heading. Uses `toContainText` to remain resilient
   * to minor copy changes (e.g. punctuation or case adjustments).
   */
  async assertOrderComplete(): Promise<void> {
    await expect(this.page.locator(this.COMPLETE_HEADER)).toContainText(
      this.ORDER_COMPLETE_TEXT,
    );
  }

  /**
   * Asserts that the checkout error banner is visible and contains the given text.
   * Useful for validating required-field validation messages on step one.
   *
   * @param expectedText - Substring expected to appear in the error banner.
   */
  async assertCheckoutError(expectedText: string): Promise<void> {
    await expect(this.page.locator(this.ERROR_BANNER)).toContainText(expectedText);
  }
}
