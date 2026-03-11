/**
 * @file tests/e2e/e2e-flow.spec.ts
 * @purpose Hybrid E2E tests demonstrating the 80/20 API+UI pattern.
 *          API operations handle setup, verification, and teardown (the "80").
 *          UI interactions cover only the user-visible journey (the "20").
 *
 *          Two systems are tested in combination:
 *          - Restful-Booker: back-end booking/order API (state management)
 *          - SauceDemo:      front-end storefront UI (user journey)
 *
 *          In a real enterprise stack these would be one integrated system.
 *          The pattern here is identical — only the system names change.
 *
 * @pattern Hybrid UI+API Testing (80/20 Rule) + Page Object Model
 *
 * SOLID:
 *   SRP — this file owns E2E hybrid flows only; isolated-layer tests live in api/ and e2e/.
 *   DIP — tests depend on ApiClient and Page Object abstractions, not raw HTTP/Playwright calls.
 *   OCP — new E2E scenarios are added as test() calls; existing tests and infrastructure unchanged.
 */

import { test, expect } from '../../fixtures';
import { InventoryPage } from '../../pages/InventoryPage';
import { CartPage } from '../../pages/CartPage';
import { CheckoutPage } from '../../pages/CheckoutPage';
import { BookingBuilder } from '../../helpers/BookingBuilder';
import { TestDataFactory } from '../../helpers/TestDataFactory';
import { type CreateBookingResponse, type Booking } from '../../data/types';

// ─── Constants ──────────────────────────────────────────────────────────────────

const BOOKINGS_ENDPOINT = '/booking';

/** Standard JSON headers for Restful-Booker POST/PUT/PATCH requests. */
const JSON_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

/** Builds the Cookie auth header expected by Restful-Booker mutating endpoints. */
function authCookie(token: string): Record<string, string> {
  return { Cookie: `token=${token}` };
}

// ─── Suite 1: API State + UI Journey ────────────────────────────────────────────

test.describe('E2E — API State + UI Journey', { tag: ['@smoke', '@e2e'] }, () => {
  // ── Test 1: Full SauceDemo purchase flow ──────────────────────────────────────

  test(
    'full SauceDemo purchase flow via loggedInPage fixture @smoke @e2e',
    async ({ loggedInPage }) => {
      // ── Arrange ─────────────────────────────────────────────────────────────
      // loggedInPage fixture provides an already-authenticated page on /inventory.html.
      // Zero login boilerplate here — auth is the fixture's single responsibility.
      const inventoryPage = new InventoryPage(loggedInPage);
      const cartPage = new CartPage(loggedInPage);
      const checkoutPage = new CheckoutPage(loggedInPage);

      // ── Act: add two items ───────────────────────────────────────────────────
      await inventoryPage.addItemToCart('Sauce Labs Backpack');
      await inventoryPage.addItemToCart('Sauce Labs Fleece Jacket');
      await inventoryPage.goToCart();

      // ── Assert: both items in cart ───────────────────────────────────────────
      const cartItems = await cartPage.getCartItems();
      expect(cartItems, 'Cart should contain exactly 2 items').toHaveLength(2);

      const itemNames = cartItems.map((i) => i.name);
      expect(itemNames, 'Backpack should be in cart').toContain('Sauce Labs Backpack');
      expect(itemNames, 'Fleece Jacket should be in cart').toContain('Sauce Labs Fleece Jacket');

      // ── Act: proceed through checkout ────────────────────────────────────────
      await cartPage.proceedToCheckout();
      await checkoutPage.fillShippingInfo(TestDataFactory.create('checkout-info'));
      await checkoutPage.continueToReview();

      // Assert: summary total is present on step two
      const summaryTotal = await checkoutPage.getSummaryTotal();
      expect(summaryTotal, 'Summary total should contain a dollar amount').toContain('$');

      await checkoutPage.finishCheckout();

      // ── Assert: order complete ───────────────────────────────────────────────
      await checkoutPage.assertOrderComplete();
    },
  );

  // ── Test 2: API booking lifecycle (create → patch → verify → delete) ──────────

  test(
    'API-seeded booking lifecycle — create, verify, update, delete @smoke @e2e',
    async ({ apiClient, authToken }) => {
      // Track created resource for afterEach cleanup
      let createdBookingId = -1;

      // ── Arrange (API — 80%): create the booking ──────────────────────────────
      const payload = new BookingBuilder()
        .withGuest('E2E', 'TestUser')
        .withDates('2026-06-01', '2026-06-07')
        .withTotalPrice(500)
        .withDepositPaid(true)
        .withAdditionalNeeds('Test data — safe to delete')
        .build();

      const createResult = await apiClient.post<CreateBookingResponse>(
        BOOKINGS_ENDPOINT,
        payload,
        JSON_HEADERS,
      );

      expect(createResult.ok, 'POST /booking should succeed').toBe(true);
      if (!createResult.ok) return;

      createdBookingId = createResult.data.bookingid;
      expect(createdBookingId, 'Booking ID should be a positive integer').toBeGreaterThan(0);
      expect(
        createResult.data.booking.firstname,
        'Created booking firstname should match payload',
      ).toBe('E2E');

      // ── Act (API — 80%): patch the booking ───────────────────────────────────
      const patchPayload: Partial<Booking> = { firstname: 'E2E-Updated' };
      const patchResult = await apiClient.patch<Booking>(
        `${BOOKINGS_ENDPOINT}/${createdBookingId}`,
        patchPayload,
        { ...JSON_HEADERS, ...authCookie(authToken) },
      );

      expect(patchResult.ok, 'PATCH /booking/:id should succeed with valid auth').toBe(true);
      if (!patchResult.ok) return;
      expect(patchResult.data.firstname, 'Patched firstname should be updated').toBe('E2E-Updated');

      // ── Verify (API — 80%): GET the updated booking ──────────────────────────
      const getResult = await apiClient.get<Booking>(`${BOOKINGS_ENDPOINT}/${createdBookingId}`);

      expect(getResult.ok, 'GET /booking/:id should return the updated booking').toBe(true);
      if (!getResult.ok) return;
      expect(getResult.data.firstname, 'GET should reflect the patched firstname').toBe(
        'E2E-Updated',
      );
      expect(getResult.data.totalprice, 'totalprice should be unchanged after PATCH').toBe(500);

      // ── Teardown (API — 80%): delete and verify removal ──────────────────────
      const deleteResult = await apiClient.delete(
        `${BOOKINGS_ENDPOINT}/${createdBookingId}`,
        authCookie(authToken),
      );

      expect(deleteResult.ok, 'DELETE /booking/:id should succeed with valid auth').toBe(true);
      createdBookingId = -1; // Mark as cleaned up so afterEach skips

      const deletedGetResult = await apiClient.get<Booking>(
        `${BOOKINGS_ENDPOINT}/${createdBookingId === -1 ? createResult.data.bookingid : createdBookingId}`,
      );
      expect(
        deletedGetResult.ok,
        'GET after DELETE should return not-found (ok: false)',
      ).toBe(false);
    },
  );

  // ── Test 3: True hybrid — API seeds state, UI completes journey, API verifies ──

  test(
    'combined — API creates order record, UI completes purchase, API verifies @e2e',
    async ({ apiClient, authToken, loggedInPage }) => {
      // In a real integrated system, the UI checkout would automatically POST to the
      // order API. Here we demonstrate the pattern: API state and UI journey are
      // independently verifiable layers of the same business scenario.

      let orderId = -1;

      // ── Step 1 (API — 80%): create an "order record" in the backend ──────────
      const orderPayload = new BookingBuilder()
        .withGuest('Hybrid', 'Tester')
        .withDates('2026-07-01', '2026-07-05')
        .withTotalPrice(129)
        .withDepositPaid(false)
        .build();

      const orderResult = await apiClient.post<CreateBookingResponse>(
        BOOKINGS_ENDPOINT,
        orderPayload,
        JSON_HEADERS,
      );

      expect(orderResult.ok, 'Backend order creation should succeed').toBe(true);
      if (!orderResult.ok) return;

      orderId = orderResult.data.bookingid;

      // ── Step 2 (UI — 20%): customer completes the purchase on the storefront ──
      const inventoryPage = new InventoryPage(loggedInPage);
      await inventoryPage.addItemToCart('Sauce Labs Backpack');
      await inventoryPage.goToCart();

      const cartPage = new CartPage(loggedInPage);
      await cartPage.proceedToCheckout();

      const checkoutPage = new CheckoutPage(loggedInPage);
      await checkoutPage.fillShippingInfo(TestDataFactory.create('checkout-info'));
      await checkoutPage.continueToReview();
      await checkoutPage.finishCheckout();
      await checkoutPage.assertOrderComplete();

      // ── Step 3 (API — 80%): verify backend state is intact ───────────────────
      const verifyResult = await apiClient.get<Booking>(`${BOOKINGS_ENDPOINT}/${orderId}`);

      expect(
        verifyResult.ok,
        'Backend order record should still exist after UI purchase',
      ).toBe(true);

      if (!verifyResult.ok) return;
      expect(
        verifyResult.data.firstname,
        'Backend order record firstname should match what was created',
      ).toBe('Hybrid');

      // ── Step 4 (API — 80%): clean up the test order ──────────────────────────
      const cleanupResult = await apiClient.delete(
        `${BOOKINGS_ENDPOINT}/${orderId}`,
        authCookie(authToken),
      );

      expect(cleanupResult.ok, 'Test order cleanup should succeed').toBe(true);
    },
  );
});

// ─── Suite 2: Error Recovery & Resilience ───────────────────────────────────────

test.describe('E2E — Resilience Patterns', { tag: ['@e2e'] }, () => {
  // ── Test 4: Explicit create-verify-delete lifecycle in a single test ──────────

  test(
    'API booking create-verify-delete lifecycle is fully self-contained @e2e',
    async ({ apiClient, authToken }) => {
      // This test demonstrates that cleanup is co-located with the operation,
      // making it safe to run in shared or parallel environments.

      // ── Create ───────────────────────────────────────────────────────────────
      const payload = BookingBuilder.default();
      const createResult = await apiClient.post<CreateBookingResponse>(
        BOOKINGS_ENDPOINT,
        payload,
        JSON_HEADERS,
      );

      expect(createResult.ok, 'Booking creation should succeed').toBe(true);
      if (!createResult.ok) return;

      const bookingId = createResult.data.bookingid;

      // ── Verify ───────────────────────────────────────────────────────────────
      const getResult = await apiClient.get<Booking>(`${BOOKINGS_ENDPOINT}/${bookingId}`);

      expect(getResult.ok, 'Created booking should be retrievable').toBe(true);
      if (!getResult.ok) return;
      expect(
        getResult.data.firstname,
        'Retrieved booking should have correct firstname',
      ).toBe(payload.firstname);

      // ── Delete ───────────────────────────────────────────────────────────────
      const deleteResult = await apiClient.delete(
        `${BOOKINGS_ENDPOINT}/${bookingId}`,
        authCookie(authToken),
      );

      expect(deleteResult.ok, 'Booking delete should succeed with valid auth').toBe(true);

      // ── Confirm deletion ─────────────────────────────────────────────────────
      const confirmResult = await apiClient.get<Booking>(`${BOOKINGS_ENDPOINT}/${bookingId}`);
      expect(
        confirmResult.ok,
        'Deleted booking should return not-found (ok: false)',
      ).toBe(false);
    },
  );

  // ── Test 5: UI handles empty cart gracefully ──────────────────────────────────

  test(
    'UI handles empty cart gracefully — no items added before navigating to cart @e2e',
    async ({ loggedInPage }) => {
      // Navigate directly to cart with no items — simulates a user who bookmarked the URL.
      await loggedInPage.goto('/cart.html');

      const cartPage = new CartPage(loggedInPage);

      // Assert: cart correctly reports empty state
      await cartPage.assertCartEmpty();

      // Assert: continue shopping navigates back to inventory
      await cartPage.continueShopping();

      expect(
        loggedInPage.url(),
        'Continue shopping from empty cart should return to inventory',
      ).toContain('/inventory');
    },
  );
});
