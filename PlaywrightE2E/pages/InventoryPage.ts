/**
 * @file pages/InventoryPage.ts
 * @purpose Page object for the SauceDemo product inventory screen (`/inventory.html`).
 *          Exposes business-level methods for browsing products, sorting, managing the
 *          cart badge, and navigating to the cart — no raw selectors leak into tests.
 * @pattern Page Object Model (POM) — single class per screen; all interaction detail
 *          is hidden behind intention-revealing public methods.
 */

import { type Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * SOLID principles satisfied:
 *
 * SRP — Single Responsibility Principle:
 *   InventoryPage owns one concern: interactions with the product listing screen.
 *   Cart management state lives in CartPage; checkout lives in CheckoutPage.
 *
 * OCP — Open/Closed Principle:
 *   New inventory behaviours (e.g. filtering by category) are added by extending
 *   or composing, not by modifying this class.
 *
 * LSP — Liskov Substitution Principle:
 *   Fully substitutable for BasePage — does not weaken any inherited contract.
 */
export class InventoryPage extends BasePage {
  // ─── Selector Constants ────────────────────────────────────────────────────
  private readonly INVENTORY_CONTAINER = '.inventory_list';
  private readonly ITEM_NAMES = '.inventory_item_name';
  private readonly ADD_TO_CART_BUTTONS = '[data-test^="add-to-cart"]';
  private readonly REMOVE_BUTTONS = '[data-test^="remove"]';
  private readonly CART_BADGE = '.shopping_cart_badge';
  private readonly SORT_DROPDOWN = '[data-test="product_sort_container"]';
  private readonly CART_LINK = '.shopping_cart_link';

  /** Path for direct navigation — useful in `beforeEach` after API-based login. */
  private readonly INVENTORY_PATH = '/inventory.html';

  /**
   * @param page - Playwright `Page` instance injected by the test fixture.
   */
  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigates directly to the inventory page.
   * Call this only after authentication has been established via cookies/storage.
   */
  async goto(): Promise<void> {
    await this.navigateTo(this.INVENTORY_PATH);
    await expect(this.page.locator(this.INVENTORY_CONTAINER)).toBeVisible();
  }

  /**
   * Adds a specific product to the cart by matching its visible name.
   * Locates the parent inventory-item container first, then clicks the
   * add-to-cart button scoped to that container — avoids positional assumptions.
   *
   * @param itemName - Exact display name of the product (case-sensitive).
   */
  async addItemToCart(itemName: string): Promise<void> {
    const itemContainer = this.page
      .locator('.inventory_item')
      .filter({ has: this.page.locator(this.ITEM_NAMES, { hasText: itemName }) });

    await itemContainer.locator(this.ADD_TO_CART_BUTTONS).click();
  }

  /**
   * Removes a specific product from the cart while still on the inventory page.
   * Uses the same container-scoping strategy as `addItemToCart`.
   *
   * @param itemName - Exact display name of the product to remove.
   */
  async removeItemFromCart(itemName: string): Promise<void> {
    const itemContainer = this.page
      .locator('.inventory_item')
      .filter({ has: this.page.locator(this.ITEM_NAMES, { hasText: itemName }) });

    await itemContainer.locator(this.REMOVE_BUTTONS).click();
  }

  /**
   * Returns the current cart item count displayed in the shopping-cart badge.
   * Returns `0` when the badge is absent (empty cart — SauceDemo hides the badge).
   */
  async getCartCount(): Promise<number> {
    const badge = this.page.locator(this.CART_BADGE);
    const isVisible = await badge.isVisible();
    if (!isVisible) {
      return 0;
    }
    const text = await badge.innerText();
    const parsed = parseInt(text, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Selects a sort order from the product-sort dropdown.
   *
   * @param option - One of the four supported sort keys:
   *   - `'az'`   — Name (A to Z)
   *   - `'za'`   — Name (Z to A)
   *   - `'lohi'` — Price (low to high)
   *   - `'hilo'` — Price (high to low)
   */
  async sortBy(option: 'az' | 'za' | 'lohi' | 'hilo'): Promise<void> {
    await this.page.locator(this.SORT_DROPDOWN).selectOption(option);
  }

  /**
   * Clicks the shopping-cart icon to navigate to the cart page.
   */
  async goToCart(): Promise<void> {
    await this.page.locator(this.CART_LINK).click();
    await expect(this.page).toHaveURL(/\/cart/);
  }

  /**
   * Returns an array of all visible product names on the inventory page,
   * in DOM order (which reflects the current sort order).
   */
  async getInventoryItemNames(): Promise<string[]> {
    await expect(this.page.locator(this.ITEM_NAMES).first()).toBeVisible();
    return this.page.locator(this.ITEM_NAMES).allInnerTexts();
  }
}
