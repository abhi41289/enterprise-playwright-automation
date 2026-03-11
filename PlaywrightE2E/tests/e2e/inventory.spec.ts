/**
 * @file tests/e2e/inventory.spec.ts
 * @purpose SauceDemo inventory page tests — item listing, add/remove cart operations,
 *          multi-item cart tracking, and ascending/descending name sort.
 * @pattern Page Object Model + `loggedInPage` fixture.
 *          Authentication is handled entirely by the `loggedInPage` fixture; each test
 *          receives a `Page` that is already on `/inventory.html` as `standard_user`.
 *          No `beforeEach` login steps appear in this file.
 *
 * SOLID principles satisfied:
 *
 * SRP — Single Responsibility Principle:
 *   This file owns one concern: exercising the SauceDemo inventory screen.
 *   Login behaviour lives in login.spec.ts; cart detail and checkout live elsewhere.
 *
 * OCP — Open/Closed Principle:
 *   New inventory scenarios are added as additional `test()` calls; existing tests
 *   and the InventoryPage class are left untouched.
 *
 * DIP — Dependency Inversion Principle:
 *   Tests depend on the `InventoryPage` abstraction rather than raw `page.locator()`
 *   calls.  Product names are declared as constants so a label change is a single edit.
 */

import { test, expect } from '../../fixtures';
import { InventoryPage } from '../../pages/InventoryPage';

// ─── Constants ──────────────────────────────────────────────────────────────────
// Product name literals are declared once; tests reference these constants so any
// SauceDemo catalogue rename requires a single change in this block.

/** Display name of the first product used in add/remove cart tests. */
const PRODUCT_BACKPACK = 'Sauce Labs Backpack';

/** Display name of the second product used in the multi-item cart test. */
const PRODUCT_BIKE_LIGHT = 'Sauce Labs Bike Light';

// ─── Test Suite ─────────────────────────────────────────────────────────────────

/**
 * Inventory suite — exercises product listing, cart badge management, and sort order
 * on the SauceDemo `/inventory.html` screen.
 *
 * The `loggedInPage` fixture supplies an authenticated `Page`; tests instantiate
 * `InventoryPage` at the top of each test body and interact only through its API.
 * Playwright's per-test fixture scope ensures each test starts from a clean, fresh
 * browser context — no shared DOM state between tests.
 */
test.describe('SauceDemo — Inventory', { tag: ['@smoke', '@e2e'] }, () => {
  // ── Test 1: Inventory list is populated ───────────────────────────────────────

  test(
    'should display the inventory list with items @smoke @e2e',
    async ({ loggedInPage }) => {
      // Arrange — bind page object to the pre-authenticated page
      const inventoryPage = new InventoryPage(loggedInPage);

      // Act — retrieve all visible product names from the DOM
      const items = await inventoryPage.getInventoryItemNames();

      // Assert — at least one product is rendered
      expect(items.length, 'Expected the inventory to contain at least one item').toBeGreaterThan(0);

      // Assert — every name in the list is a non-empty string (no blank labels)
      for (const name of items) {
        expect(
          name.trim().length,
          `Expected every inventory item name to be non-empty, but found: "${name}"`,
        ).toBeGreaterThan(0);
      }
    },
  );

  // ── Test 2: Add single item → badge shows 1 ───────────────────────────────────

  test(
    'should add an item to cart and update badge count @smoke @e2e',
    async ({ loggedInPage }) => {
      // Arrange
      const inventoryPage = new InventoryPage(loggedInPage);

      // Act — add one product to the cart
      await inventoryPage.addItemToCart(PRODUCT_BACKPACK);

      // Assert — cart badge reflects exactly one item
      const count = await inventoryPage.getCartCount();
      expect(count, 'Expected cart badge to show 1 after adding one item').toBe(1);
    },
  );

  // ── Test 3: Add then remove → badge returns to 0 ─────────────────────────────

  test('should remove an item from cart and update badge count @e2e', async ({ loggedInPage }) => {
    // Arrange
    const inventoryPage = new InventoryPage(loggedInPage);

    // Act — add item and confirm it registered
    await inventoryPage.addItemToCart(PRODUCT_BACKPACK);
    const countAfterAdd = await inventoryPage.getCartCount();
    expect(countAfterAdd, 'Pre-condition: expected cart count to be 1 after add').toBe(1);

    // Act — remove the same item
    await inventoryPage.removeItemFromCart(PRODUCT_BACKPACK);

    // Assert — badge disappears (getCartCount returns 0 when badge is absent)
    const countAfterRemove = await inventoryPage.getCartCount();
    expect(
      countAfterRemove,
      'Expected cart badge to show 0 after removing the only item',
    ).toBe(0);
  });

  // ── Test 4: Add two items → badge shows 2 ────────────────────────────────────

  test('should add multiple items and track count @e2e', async ({ loggedInPage }) => {
    // Arrange
    const inventoryPage = new InventoryPage(loggedInPage);

    // Act — add two distinct products
    await inventoryPage.addItemToCart(PRODUCT_BACKPACK);
    await inventoryPage.addItemToCart(PRODUCT_BIKE_LIGHT);

    // Assert — cart badge reflects the cumulative total of two items
    const count = await inventoryPage.getCartCount();
    expect(count, 'Expected cart badge to show 2 after adding two items').toBe(2);
  });

  // ── Test 5: Sort A → Z ────────────────────────────────────────────────────────

  test('should sort items A to Z @e2e', async ({ loggedInPage }) => {
    // Arrange
    const inventoryPage = new InventoryPage(loggedInPage);

    // Act — apply the A-to-Z sort option
    await inventoryPage.sortBy('az');

    // Assert — first item name alphabetically precedes the last item name
    const names = await inventoryPage.getInventoryItemNames();

    expect(
      names.length,
      'Expected at least two items to be present for a meaningful sort assertion',
    ).toBeGreaterThan(1);

    const firstName = names[0] as string;
    const lastName = names[names.length - 1] as string;

    expect(
      firstName.localeCompare(lastName),
      `Expected "${firstName}" to come before "${lastName}" in A-to-Z order`,
    ).toBeLessThan(0);
  });

  // ── Test 6: Sort Z → A ────────────────────────────────────────────────────────

  test('should sort items Z to A @e2e', async ({ loggedInPage }) => {
    // Arrange
    const inventoryPage = new InventoryPage(loggedInPage);

    // Act — apply the Z-to-A sort option
    await inventoryPage.sortBy('za');

    // Assert — first item name alphabetically follows the last item name (reverse order)
    const names = await inventoryPage.getInventoryItemNames();

    expect(
      names.length,
      'Expected at least two items to be present for a meaningful sort assertion',
    ).toBeGreaterThan(1);

    const firstName = names[0] as string;
    const lastName = names[names.length - 1] as string;

    expect(
      firstName.localeCompare(lastName),
      `Expected "${firstName}" to come after "${lastName}" in Z-to-A order`,
    ).toBeGreaterThan(0);
  });
});
