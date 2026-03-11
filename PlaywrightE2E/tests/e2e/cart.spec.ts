/**
 * @file tests/e2e/cart.spec.ts
 * @purpose SauceDemo cart page tests — item verification, remove, continue shopping,
 *          and checkout navigation. Validates the full cart interaction surface
 *          after items have been added from the inventory screen.
 * @pattern Page Object Model + loggedInPage fixture — each test constructs page objects
 *          from the pre-authenticated page, then navigates to the cart via InventoryPage.
 */

import { test, expect } from '../../fixtures';
import { InventoryPage } from '../../pages/InventoryPage';
import { CartPage } from '../../pages/CartPage';
import { type CartItem } from '../../data/types';

// ─── Test Suite ─────────────────────────────────────────────────────────────────

test.describe('SauceDemo — Cart', { tag: ['@smoke', '@e2e'] }, () => {
  // ── Test 1: Single item appears in cart ─────────────────────────────────────────

  test('should show added items in the cart @smoke @e2e', async ({ loggedInPage }) => {
    // ── Arrange ─────────────────────────────────────────────────────────────────
    const inventoryPage = new InventoryPage(loggedInPage);
    await inventoryPage.addItemToCart('Sauce Labs Backpack');

    // ── Act ─────────────────────────────────────────────────────────────────────
    await inventoryPage.goToCart();
    const cartPage = new CartPage(loggedInPage);

    // ── Assert: named item is visible in cart ────────────────────────────────────
    await cartPage.assertItemInCart('Sauce Labs Backpack');

    // ── Assert: cart contains exactly one item with a positive price ─────────────
    const items: CartItem[] = await cartPage.getCartItems();

    expect(items.length, 'Expected exactly one item in the cart').toBe(1);
    expect(
      items[0]?.name,
      'Expected item name to match the added product',
    ).toBe('Sauce Labs Backpack');
    expect(
      items[0]?.price,
      'Expected item price to be greater than zero',
    ).toBeGreaterThan(0);
  });

  // ── Test 2: Multiple items appear in cart ────────────────────────────────────────

  test('should show multiple items added from inventory @e2e', async ({ loggedInPage }) => {
    // ── Arrange ─────────────────────────────────────────────────────────────────
    const inventoryPage = new InventoryPage(loggedInPage);
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    await inventoryPage.addItemToCart('Sauce Labs Bike Light');

    // ── Act ─────────────────────────────────────────────────────────────────────
    await inventoryPage.goToCart();
    const cartPage = new CartPage(loggedInPage);

    const items: CartItem[] = await cartPage.getCartItems();

    // ── Assert: cart holds both added items ──────────────────────────────────────
    expect(items.length, 'Expected exactly two items in the cart').toBe(2);

    const itemNames = items.map((item) => item.name);

    expect(
      itemNames,
      'Expected Sauce Labs Backpack to be present in the cart',
    ).toContain('Sauce Labs Backpack');
    expect(
      itemNames,
      'Expected Sauce Labs Bike Light to be present in the cart',
    ).toContain('Sauce Labs Bike Light');
  });

  // ── Test 3: Remove an item from the cart ─────────────────────────────────────────

  test('should remove an item from the cart @e2e', async ({ loggedInPage }) => {
    // ── Arrange ─────────────────────────────────────────────────────────────────
    const inventoryPage = new InventoryPage(loggedInPage);
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    await inventoryPage.goToCart();
    const cartPage = new CartPage(loggedInPage);

    // ── Act ─────────────────────────────────────────────────────────────────────
    await cartPage.removeItem('Sauce Labs Backpack');

    // ── Assert: cart is empty after removal ───────────────────────────────────────
    await cartPage.assertCartEmpty();
  });

  // ── Test 4: Continue shopping navigates back to inventory ────────────────────────

  test('should navigate back to inventory via continue shopping @e2e', async ({
    loggedInPage,
  }) => {
    // ── Arrange ─────────────────────────────────────────────────────────────────
    const inventoryPage = new InventoryPage(loggedInPage);
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    await inventoryPage.goToCart();
    const cartPage = new CartPage(loggedInPage);

    // ── Act ─────────────────────────────────────────────────────────────────────
    await cartPage.continueShopping();

    // ── Assert: URL contains the inventory path ───────────────────────────────────
    expect(
      loggedInPage.url(),
      'Expected URL to contain /inventory after clicking Continue Shopping',
    ).toContain('/inventory');
  });

  // ── Test 5: Proceed to checkout navigates to step one ────────────────────────────

  test('should navigate to checkout step one @smoke @e2e', async ({ loggedInPage }) => {
    // ── Arrange ─────────────────────────────────────────────────────────────────
    const inventoryPage = new InventoryPage(loggedInPage);
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    await inventoryPage.goToCart();
    const cartPage = new CartPage(loggedInPage);

    // ── Act ─────────────────────────────────────────────────────────────────────
    await cartPage.proceedToCheckout();

    // ── Assert: URL contains the checkout step one path ──────────────────────────
    expect(
      loggedInPage.url(),
      'Expected URL to contain checkout-step-one after proceeding to checkout',
    ).toContain('checkout-step-one');
  });
});
