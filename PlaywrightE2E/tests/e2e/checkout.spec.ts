/**
 * @file tests/e2e/checkout.spec.ts
 * @purpose SauceDemo end-to-end checkout flow — happy path, validation errors, and
 *          order completion. This is the most complex UI flow in the suite, spanning
 *          three screens: checkout step one (shipping info), step two (order review),
 *          and the completion confirmation.
 * @pattern Page Object Model + loggedInPage fixture — each test drives the full
 *          cart → checkout step one pipeline inline before exercising a specific
 *          checkout scenario. No shared mutable state is carried across tests.
 */

import { test, expect } from '../../fixtures';
import { InventoryPage } from '../../pages/InventoryPage';
import { CartPage } from '../../pages/CartPage';
import { CheckoutPage } from '../../pages/CheckoutPage';
import { TestDataFactory } from '../../helpers/TestDataFactory';
import { type CartItem } from '../../data/types';

// ─── Test Suite ─────────────────────────────────────────────────────────────────

test.describe('SauceDemo — Checkout', { tag: ['@smoke', '@e2e'] }, () => {
  // ── Test 1: Full happy-path checkout ─────────────────────────────────────────────

  test('should complete full checkout flow successfully @smoke @e2e', async ({
    loggedInPage,
  }) => {
    // ── Arrange: add item and reach checkout step one ────────────────────────────
    const inventoryPage = new InventoryPage(loggedInPage);
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    await inventoryPage.goToCart();
    const cartPage = new CartPage(loggedInPage);
    await cartPage.proceedToCheckout();
    const checkoutPage = new CheckoutPage(loggedInPage);

    // ── Act: fill step one and advance to the review screen ─────────────────────
    await checkoutPage.fillShippingInfo(TestDataFactory.create('checkout-info'));
    await checkoutPage.continueToReview();

    // ── Assert: summary total label contains 'Total' ─────────────────────────────
    const summaryTotal = await checkoutPage.getSummaryTotal();

    expect(
      summaryTotal,
      'Expected the summary total label to contain the word "Total"',
    ).toContain('Total');

    // ── Act: finish the order ─────────────────────────────────────────────────────
    await checkoutPage.finishCheckout();

    // ── Assert: order-complete confirmation is displayed ─────────────────────────
    await checkoutPage.assertOrderComplete();
  });

  // ── Test 2: Correct item shown on checkout review screen ─────────────────────────

  test('should show the correct item in checkout review @e2e', async ({ loggedInPage }) => {
    // ── Arrange ─────────────────────────────────────────────────────────────────
    const inventoryPage = new InventoryPage(loggedInPage);
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    await inventoryPage.goToCart();
    const cartPage = new CartPage(loggedInPage);
    await cartPage.proceedToCheckout();
    const checkoutPage = new CheckoutPage(loggedInPage);

    // ── Act: complete step one to reach the review screen ────────────────────────
    await checkoutPage.fillShippingInfo(TestDataFactory.create('checkout-info'));
    await checkoutPage.continueToReview();

    // ── Assert: review screen shows the correct item with a positive price ────────
    // CartPage works on any page that renders cart-item elements — step two does.
    const reviewCartPage = new CartPage(loggedInPage);
    const items: CartItem[] = await reviewCartPage.getCartItems();

    expect(items.length, 'Expected exactly one item on the checkout review screen').toBe(1);
    expect(
      items[0]?.name,
      'Expected the item name to be Sauce Labs Backpack on the review screen',
    ).toBe('Sauce Labs Backpack');
    expect(
      items[0]?.price,
      'Expected the item price to be greater than zero on the review screen',
    ).toBeGreaterThan(0);
  });

  // ── Test 3: Validation error — empty first name ───────────────────────────────────

  test('should show error for empty first name @e2e', async ({ loggedInPage }) => {
    // ── Arrange ─────────────────────────────────────────────────────────────────
    const inventoryPage = new InventoryPage(loggedInPage);
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    await inventoryPage.goToCart();
    const cartPage = new CartPage(loggedInPage);
    await cartPage.proceedToCheckout();
    const checkoutPage = new CheckoutPage(loggedInPage);

    // ── Act: submit step one with an empty first name ────────────────────────────
    await checkoutPage.fillShippingInfo({
      firstName: '',
      lastName: 'Automation',
      postalCode: '90210',
    });
    await checkoutPage.continueToReview();

    // ── Assert: error banner surfaces the expected validation message ─────────────
    await checkoutPage.assertCheckoutError('First Name is required');
  });

  // ── Test 4: Validation error — empty last name ────────────────────────────────────

  test('should show error for empty last name @e2e', async ({ loggedInPage }) => {
    // ── Arrange ─────────────────────────────────────────────────────────────────
    const inventoryPage = new InventoryPage(loggedInPage);
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    await inventoryPage.goToCart();
    const cartPage = new CartPage(loggedInPage);
    await cartPage.proceedToCheckout();
    const checkoutPage = new CheckoutPage(loggedInPage);

    // ── Act: submit step one with an empty last name ─────────────────────────────
    await checkoutPage.fillShippingInfo({
      firstName: 'Test',
      lastName: '',
      postalCode: '90210',
    });
    await checkoutPage.continueToReview();

    // ── Assert: error banner surfaces the expected validation message ─────────────
    await checkoutPage.assertCheckoutError('Last Name is required');
  });

  // ── Test 5: Validation error — empty postal code ─────────────────────────────────

  test('should show error for empty postal code @e2e', async ({ loggedInPage }) => {
    // ── Arrange ─────────────────────────────────────────────────────────────────
    const inventoryPage = new InventoryPage(loggedInPage);
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    await inventoryPage.goToCart();
    const cartPage = new CartPage(loggedInPage);
    await cartPage.proceedToCheckout();
    const checkoutPage = new CheckoutPage(loggedInPage);

    // ── Act: submit step one with an empty postal code ───────────────────────────
    await checkoutPage.fillShippingInfo({
      firstName: 'Test',
      lastName: 'Automation',
      postalCode: '',
    });
    await checkoutPage.continueToReview();

    // ── Assert: error banner surfaces the expected validation message ─────────────
    await checkoutPage.assertCheckoutError('Postal Code is required');
  });

  // ── Test 6: Summary total on step two is non-empty and contains a dollar sign ─────

  test('should show summary total on checkout step two @e2e', async ({ loggedInPage }) => {
    // ── Arrange ─────────────────────────────────────────────────────────────────
    const inventoryPage = new InventoryPage(loggedInPage);
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    await inventoryPage.goToCart();
    const cartPage = new CartPage(loggedInPage);
    await cartPage.proceedToCheckout();
    const checkoutPage = new CheckoutPage(loggedInPage);

    // ── Act: complete step one to reach the review screen ────────────────────────
    await checkoutPage.fillShippingInfo(TestDataFactory.create('checkout-info'));
    await checkoutPage.continueToReview();

    const summaryTotal = await checkoutPage.getSummaryTotal();

    // ── Assert: total is non-empty and includes a dollar-sign currency indicator ──
    expect(
      summaryTotal.length,
      'Expected the summary total string to be non-empty',
    ).toBeGreaterThan(0);
    expect(
      summaryTotal,
      'Expected the summary total string to contain a $ character',
    ).toContain('$');
  });
});
