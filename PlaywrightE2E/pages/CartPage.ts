/**
 * @file pages/CartPage.ts
 * @purpose Page object for the SauceDemo shopping cart screen (`/cart.html`).
 *          Encapsulates reading cart line items, removing items, and navigating
 *          forward to checkout or back to the inventory — no selectors leak into tests.
 * @pattern Page Object Model (POM) — all cart-screen interaction detail is hidden
 *          behind strongly-typed, intention-revealing public methods.
 */

import { type Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { type CartItem } from '../data/types';

/**
 * SOLID principles satisfied:
 *
 * SRP — Single Responsibility Principle:
 *   CartPage owns one concern: the shopping-cart screen. It has no knowledge
 *   of login, inventory browsing, or checkout form submission.
 *
 * OCP — Open/Closed Principle:
 *   Additional cart assertions (e.g. quantity validation) are added by extending
 *   or composing — not by modifying this class.
 *
 * LSP — Liskov Substitution Principle:
 *   Fully substitutable for BasePage; no inherited contract is weakened.
 *
 * DIP — Dependency Inversion Principle:
 *   Returns domain types (`CartItem`) rather than raw Playwright objects,
 *   so callers depend on the stable data abstraction, not on Locator internals.
 */
export class CartPage extends BasePage {
  // ─── Selector Constants ────────────────────────────────────────────────────
  private readonly CART_ITEMS = '.cart_item';
  private readonly ITEM_NAME = '.inventory_item_name';
  private readonly ITEM_PRICE = '.inventory_item_price';
  private readonly REMOVE_BUTTON = '[data-test^="remove"]';
  private readonly CONTINUE_SHOPPING = '[data-test="continue-shopping"]';
  private readonly CHECKOUT_BUTTON = '[data-test="checkout"]';

  /** Quantity element inside a cart item row. */
  private readonly ITEM_QUANTITY = '.cart_quantity';

  /** Path for direct navigation when needed. */
  private readonly CART_PATH = '/cart.html';

  /**
   * @param page - Playwright `Page` instance injected by the test fixture.
   */
  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigates directly to the cart page.
   */
  async goto(): Promise<void> {
    await this.navigateTo(this.CART_PATH);
  }

  /**
   * Scrapes all line items currently in the cart and returns them as an array
   * of typed `CartItem` objects. Price strings (e.g. `"$29.99"`) are parsed to
   * plain numbers; quantity strings are parsed to integers.
   *
   * Items with unparseable price or quantity values are included with `0` for
   * the affected field rather than being silently dropped.
   */
  async getCartItems(): Promise<CartItem[]> {
    const itemLocators = this.page.locator(this.CART_ITEMS);
    const count = await itemLocators.count();
    const items: CartItem[] = [];

    for (let i = 0; i < count; i++) {
      const row = itemLocators.nth(i);

      const name = (await row.locator(this.ITEM_NAME).innerText()).trim();

      const priceText = (await row.locator(this.ITEM_PRICE).innerText()).trim();
      const price = parseFloat(priceText.replace('$', ''));

      const quantityText = (await row.locator(this.ITEM_QUANTITY).innerText()).trim();
      const quantity = parseInt(quantityText, 10);

      items.push({
        name,
        price: Number.isNaN(price) ? 0 : price,
        quantity: Number.isNaN(quantity) ? 0 : quantity,
      });
    }

    return items;
  }

  /**
   * Removes a specific item from the cart by matching its visible name.
   * Scopes the remove-button click to the parent cart-item row to avoid
   * accidental clicks when multiple items share a similar name prefix.
   *
   * @param itemName - Exact display name of the product to remove.
   */
  async removeItem(itemName: string): Promise<void> {
    const row = this.page
      .locator(this.CART_ITEMS)
      .filter({ has: this.page.locator(this.ITEM_NAME, { hasText: itemName }) });

    await row.locator(this.REMOVE_BUTTON).click();
  }

  /**
   * Asserts that a product with the given name is present in the cart.
   *
   * @param itemName - Exact display name of the expected product.
   */
  async assertItemInCart(itemName: string): Promise<void> {
    await expect(
      this.page
        .locator(this.CART_ITEMS)
        .filter({ has: this.page.locator(this.ITEM_NAME, { hasText: itemName }) }),
    ).toBeVisible();
  }

  /**
   * Asserts that the cart contains no line items.
   * Uses a count assertion rather than checking a specific empty-state element,
   * since SauceDemo shows no dedicated "cart is empty" message.
   */
  async assertCartEmpty(): Promise<void> {
    await expect(this.page.locator(this.CART_ITEMS)).toHaveCount(0);
  }

  /**
   * Clicks the "Checkout" button to begin the checkout flow.
   * Asserts navigation to the checkout step-one page as a guard.
   */
  async proceedToCheckout(): Promise<void> {
    await this.page.locator(this.CHECKOUT_BUTTON).click();
    await expect(this.page).toHaveURL(/\/checkout-step-one/);
  }

  /**
   * Clicks "Continue Shopping" to return to the inventory page.
   */
  async continueShopping(): Promise<void> {
    await this.page.locator(this.CONTINUE_SHOPPING).click();
    await expect(this.page).toHaveURL(/\/inventory/);
  }
}
