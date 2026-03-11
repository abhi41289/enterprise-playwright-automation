/**
 * @file tests/api/bookings.spec.ts
 * @purpose Phase 3 API test suite for the Restful-Booker booking resource.
 *          Covers the full CRUD surface: GET (list + single + not-found),
 *          POST (create), PUT/PATCH (update), and DELETE (with and without auth).
 * @pattern Arrange-Act-Assert — each test owns its own setup and assertion block.
 *          Shared resource lifecycle (create in beforeEach, clean up in afterEach)
 *          is confined to the suite that requires it; no state leaks across suites.
 */

import { test, expect } from '../../fixtures';
import { BookingBuilder } from '../../helpers/BookingBuilder';
import { TestDataFactory } from '../../helpers/TestDataFactory';
import { type Booking, type CreateBookingResponse, type ApiResult } from '../../data/types';

// ─── Constants ──────────────────────────────────────────────────────────────────

/** Base path for all booking endpoints. */
const BOOKINGS_ENDPOINT = '/booking';

/** Standard JSON request headers used for POST and PUT requests. */
const JSON_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

/**
 * Builds the Cookie auth header required by mutating endpoints (PUT, PATCH, DELETE).
 *
 * @param token - A valid Restful-Booker session token obtained via POST /auth.
 * @returns      A headers object containing the Cookie value.
 */
function AUTH_COOKIE(token: string): Record<string, string> {
  return { Cookie: `token=${token}` };
}

// ─── Type guards ────────────────────────────────────────────────────────────────

/**
 * Type guard: asserts the GET /booking response is an array of numbers.
 *
 * The /booking endpoint returns `[{ bookingid: 1 }, { bookingid: 2 }, ...]` objects,
 * but for tests that only need raw IDs the guard also supports a flat `number[]`.
 * This guard handles the flat number array case.
 *
 * @param data - Unknown value received from the API.
 */
function isBookingIdArray(data: unknown): data is number[] {
  return Array.isArray(data) && data.every((item) => typeof item === 'number');
}

/**
 * Type guard: verifies a booking object has the minimum required shape.
 *
 * @param data - Unknown value received from the API.
 */
function hasBookingShape(data: unknown): data is Booking {
  return (
    typeof data === 'object' &&
    data !== null &&
    'firstname' in data &&
    'lastname' in data &&
    'totalprice' in data &&
    'bookingdates' in data
  );
}

// ─── Internal helper ─────────────────────────────────────────────────────────────

/**
 * Extracts a flat array of booking IDs from the GET /booking response.
 *
 * The Restful-Booker API returns an array of objects `{ bookingid: number }`.
 * This helper normalises that shape to a plain `number[]` for convenience.
 *
 * @param raw - The parsed JSON from GET /booking.
 * @returns    An array of numeric booking IDs.
 * @throws     {Error} if the raw value is not an array of objects with a numeric bookingid.
 */
function extractIds(raw: unknown): number[] {
  if (!Array.isArray(raw)) {
    throw new Error(`extractIds: expected array, received ${typeof raw}`);
  }

  return raw.map((entry: unknown, index: number): number => {
    if (
      typeof entry !== 'object' ||
      entry === null ||
      !('bookingid' in entry) ||
      typeof (entry as { bookingid: unknown }).bookingid !== 'number'
    ) {
      throw new Error(
        `extractIds: entry at index ${index} is not a valid { bookingid: number } object`,
      );
    }
    return (entry as { bookingid: number }).bookingid;
  });
}

// ════════════════════════════════════════════════════════════════════════════════
// Suite 1 — GET /booking
// ════════════════════════════════════════════════════════════════════════════════

test.describe('Restful-Booker — GET Bookings', () => {
  test('GET /booking returns a non-empty array of booking IDs @smoke @api', async ({
    apiClient,
  }) => {
    // ── Act ──────────────────────────────────────────────────────────────────────
    const result: ApiResult<unknown> = await apiClient.get<unknown>(BOOKINGS_ENDPOINT, {
      Accept: 'application/json',
    });

    // ── Assert: HTTP success ─────────────────────────────────────────────────────
    expect(result.ok, 'GET /booking should return a 2xx status').toBe(true);

    if (!result.ok) return; // narrow type for subsequent assertions

    const ids = extractIds(result.data);

    // ── Assert: shape ────────────────────────────────────────────────────────────
    expect(Array.isArray(ids), 'Response should be an array').toBe(true);
    expect(ids.length, 'Booking ID array should not be empty').toBeGreaterThan(0);
    expect(
      isBookingIdArray(ids),
      'Every element in the array should be a number',
    ).toBe(true);
  });

  test('GET /booking/:id returns a valid booking object @api', async ({ apiClient }) => {
    // ── Arrange: fetch the list to get a real ID ─────────────────────────────────
    const listResult: ApiResult<unknown> = await apiClient.get<unknown>(BOOKINGS_ENDPOINT, {
      Accept: 'application/json',
    });

    expect(listResult.ok, 'Pre-condition: GET /booking must succeed').toBe(true);

    if (!listResult.ok) return;

    const ids = extractIds(listResult.data);
    expect(ids.length, 'Pre-condition: at least one booking must exist').toBeGreaterThan(0);

    const firstId = ids[0];

    // ── Act ──────────────────────────────────────────────────────────────────────
    const result: ApiResult<Booking> = await apiClient.get<Booking>(
      `${BOOKINGS_ENDPOINT}/${firstId}`,
      { Accept: 'application/json' },
    );

    // ── Assert: HTTP success ─────────────────────────────────────────────────────
    expect(result.ok, `GET /booking/${firstId} should return 2xx`).toBe(true);

    if (!result.ok) return;

    // ── Assert: required booking properties are present ──────────────────────────
    expect(
      hasBookingShape(result.data),
      'Response should have the required Booking shape',
    ).toBe(true);

    expect(result.data).toHaveProperty('firstname');
    expect(result.data).toHaveProperty('lastname');
    expect(result.data).toHaveProperty('totalprice');
    expect(result.data).toHaveProperty('depositpaid');
    expect(result.data).toHaveProperty('bookingdates');

    // ── Assert: booking dates are non-empty strings ───────────────────────────────
    const { checkin, checkout } = result.data.bookingdates;
    expect(typeof checkin === 'string' && checkin.length > 0).toBe(true);
    expect(typeof checkout === 'string' && checkout.length > 0).toBe(true);
  });

  test('GET /booking/:id returns error for non-existent ID @api', async ({ apiClient }) => {
    // ── Act ──────────────────────────────────────────────────────────────────────
    const result: ApiResult<Booking> = await apiClient.get<Booking>(
      `${BOOKINGS_ENDPOINT}/999999999`,
      { Accept: 'application/json' },
    );

    // ── Assert ───────────────────────────────────────────────────────────────────
    expect(result.ok, 'GET /booking/999999999 should NOT return 2xx').toBe(false);

    if (result.ok) return; // narrow type

    expect(result.status).toBe(404);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// Suite 2 — POST /booking (Create)
// ════════════════════════════════════════════════════════════════════════════════

test.describe('Restful-Booker — POST /booking (Create)', () => {
  /** Tracks bookingids created mid-test so afterEach can clean them up. */
  let createdBookingIds: number[] = [];

  test.afterEach(async ({ apiClient, authToken }) => {
    // Delete every booking created during the test; ignore failures (best-effort)
    for (const id of createdBookingIds) {
      await apiClient.delete(`${BOOKINGS_ENDPOINT}/${id}`, AUTH_COOKIE(authToken));
    }
    createdBookingIds = [];
  });

  test('should create a new booking and return bookingid @smoke @api', async ({
    apiClient,
  }) => {
    // ── Arrange ───────────────────────────────────────────────────────────────────
    const payload: Booking = BookingBuilder.default();

    // ── Act ───────────────────────────────────────────────────────────────────────
    const result: ApiResult<CreateBookingResponse> = await apiClient.post<CreateBookingResponse>(
      BOOKINGS_ENDPOINT,
      payload,
      JSON_HEADERS,
    );

    // ── Assert: HTTP success ─────────────────────────────────────────────────────
    expect(result.ok, 'POST /booking should return 2xx').toBe(true);

    if (!result.ok) return;

    // ── Assert: bookingid is a positive number ────────────────────────────────────
    expect(
      typeof result.data.bookingid === 'number' && result.data.bookingid > 0,
      'bookingid should be a positive number',
    ).toBe(true);

    // ── Assert: returned booking reflects sent payload ────────────────────────────
    expect(result.data.booking.firstname).toBe(payload.firstname);

    // Track for cleanup
    createdBookingIds.push(result.data.bookingid);
  });

  test('should create a booking with randomised data @api', async ({ apiClient }) => {
    // ── Arrange ───────────────────────────────────────────────────────────────────
    const payload: Booking = TestDataFactory.create('booking-random');

    // ── Act ───────────────────────────────────────────────────────────────────────
    const result: ApiResult<CreateBookingResponse> = await apiClient.post<CreateBookingResponse>(
      BOOKINGS_ENDPOINT,
      payload,
      JSON_HEADERS,
    );

    // ── Assert ───────────────────────────────────────────────────────────────────
    expect(result.ok, 'POST /booking with random data should return 2xx').toBe(true);

    if (!result.ok) return;

    expect(
      result.data.bookingid > 0,
      'bookingid should be greater than zero',
    ).toBe(true);

    // Track for afterEach cleanup
    createdBookingIds.push(result.data.bookingid);
  });

  test('should create bookings with different guests independently @api', async ({
    apiClient,
  }) => {
    // ── Arrange ───────────────────────────────────────────────────────────────────
    const payloadAlpha: Booking = new BookingBuilder()
      .withGuest('Alpha', 'Tester')
      .withTotalPrice(100)
      .withDepositPaid(true)
      .withDates('2027-01-10', '2027-01-15')
      .build();

    const payloadBeta: Booking = new BookingBuilder()
      .withGuest('Beta', 'Tester')
      .withTotalPrice(200)
      .withDepositPaid(false)
      .withDates('2027-02-10', '2027-02-15')
      .build();

    // ── Act ───────────────────────────────────────────────────────────────────────
    const resultAlpha: ApiResult<CreateBookingResponse> =
      await apiClient.post<CreateBookingResponse>(BOOKINGS_ENDPOINT, payloadAlpha, JSON_HEADERS);

    const resultBeta: ApiResult<CreateBookingResponse> =
      await apiClient.post<CreateBookingResponse>(BOOKINGS_ENDPOINT, payloadBeta, JSON_HEADERS);

    // ── Assert: both calls succeeded ─────────────────────────────────────────────
    expect(resultAlpha.ok, 'First POST /booking should return 2xx').toBe(true);
    expect(resultBeta.ok, 'Second POST /booking should return 2xx').toBe(true);

    if (!resultAlpha.ok || !resultBeta.ok) return;

    // ── Assert: IDs are distinct ──────────────────────────────────────────────────
    expect(resultAlpha.data.bookingid).not.toBe(resultBeta.data.bookingid);

    // Track both for cleanup
    createdBookingIds.push(resultAlpha.data.bookingid, resultBeta.data.bookingid);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// Suite 3 — PUT/PATCH /booking/:id (Update)
// ════════════════════════════════════════════════════════════════════════════════

test.describe('Restful-Booker — PUT/PATCH /booking/:id (Update)', () => {
  /** ID of the booking created fresh for each test in this suite. */
  let createdBookingId: number;

  /** The original booking payload stored so PATCH tests can assert unchanged fields. */
  let originalPayload: Booking;

  test.beforeEach(async ({ apiClient }) => {
    originalPayload = new BookingBuilder()
      .withGuest('Original', 'Guest')
      .withTotalPrice(300)
      .withDepositPaid(true)
      .withDates('2027-03-01', '2027-03-07')
      .withAdditionalNeeds('No extra needs')
      .build();

    const result: ApiResult<CreateBookingResponse> = await apiClient.post<CreateBookingResponse>(
      BOOKINGS_ENDPOINT,
      originalPayload,
      JSON_HEADERS,
    );

    if (!result.ok) {
      throw new Error(
        `beforeEach (Update suite): failed to create test booking — ` +
          `status: ${result.status}, error: ${result.error}`,
      );
    }

    createdBookingId = result.data.bookingid;
  });

  test.afterEach(async ({ apiClient, authToken }) => {
    // Best-effort cleanup — a failing DELETE should not mask the test result
    await apiClient.delete(
      `${BOOKINGS_ENDPOINT}/${createdBookingId}`,
      AUTH_COOKIE(authToken),
    );
  });

  test('PUT should fully replace the booking @api', async ({ apiClient, authToken }) => {
    // ── Arrange ───────────────────────────────────────────────────────────────────
    const updatedPayload: Booking = new BookingBuilder()
      .withGuest('Updated', 'Name')
      .withTotalPrice(999)
      .withDepositPaid(false)
      .withDates('2027-06-01', '2027-06-10')
      .withAdditionalNeeds('Dinner')
      .build();

    // ── Act ───────────────────────────────────────────────────────────────────────
    const result: ApiResult<Booking> = await apiClient.put<Booking>(
      `${BOOKINGS_ENDPOINT}/${createdBookingId}`,
      updatedPayload,
      { ...JSON_HEADERS, ...AUTH_COOKIE(authToken) },
    );

    // ── Assert ───────────────────────────────────────────────────────────────────
    expect(result.ok, 'PUT /booking/:id with auth should return 2xx').toBe(true);

    if (!result.ok) return;

    expect(result.data.firstname).toBe('Updated');
    expect(result.data.lastname).toBe('Name');
    expect(result.data.totalprice).toBe(999);
  });

  test('PATCH should partially update the booking @api', async ({ apiClient, authToken }) => {
    // ── Arrange: partial payload — only firstname ─────────────────────────────────
    const partialPayload: Partial<Booking> = { firstname: 'Updated' };

    // ── Act ───────────────────────────────────────────────────────────────────────
    const result: ApiResult<Booking> = await apiClient.patch<Booking>(
      `${BOOKINGS_ENDPOINT}/${createdBookingId}`,
      partialPayload,
      { ...JSON_HEADERS, ...AUTH_COOKIE(authToken) },
    );

    // ── Assert ───────────────────────────────────────────────────────────────────
    expect(result.ok, 'PATCH /booking/:id with auth should return 2xx').toBe(true);

    if (!result.ok) return;

    // Updated field reflects the patch
    expect(result.data.firstname).toBe('Updated');

    // Unchanged fields must match the original booking
    expect(result.data.lastname).toBe(originalPayload.lastname);
    expect(result.data.totalprice).toBe(originalPayload.totalprice);
  });

  test('PUT without auth should return 403 @api', async ({ apiClient }) => {
    // ── Arrange ───────────────────────────────────────────────────────────────────
    const payload: Booking = new BookingBuilder()
      .withGuest('Unauthorised', 'Attempt')
      .withTotalPrice(50)
      .withDepositPaid(false)
      .withDates('2027-09-01', '2027-09-03')
      .build();

    // ── Act: PUT without Cookie header ────────────────────────────────────────────
    const result: ApiResult<Booking> = await apiClient.put<Booking>(
      `${BOOKINGS_ENDPOINT}/${createdBookingId}`,
      payload,
      JSON_HEADERS, // deliberately omits AUTH_COOKIE
    );

    // ── Assert ───────────────────────────────────────────────────────────────────
    expect(result.ok, 'PUT without auth should NOT return 2xx').toBe(false);

    if (result.ok) return; // narrow type

    expect(result.status).toBe(403);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// Suite 4 — DELETE /booking/:id
// ════════════════════════════════════════════════════════════════════════════════

test.describe('Restful-Booker — DELETE /booking/:id', () => {
  test('should delete a booking with valid auth @api', async ({ apiClient, authToken }) => {
    // ── Arrange: create a fresh booking ──────────────────────────────────────────
    const payload: Booking = new BookingBuilder()
      .withGuest('Delete', 'Me')
      .withTotalPrice(75)
      .withDepositPaid(true)
      .withDates('2027-04-01', '2027-04-05')
      .build();

    const createResult: ApiResult<CreateBookingResponse> =
      await apiClient.post<CreateBookingResponse>(BOOKINGS_ENDPOINT, payload, JSON_HEADERS);

    expect(createResult.ok, 'Pre-condition: booking creation must succeed').toBe(true);

    if (!createResult.ok) return;

    const { bookingid } = createResult.data;

    // ── Act: DELETE with valid auth ───────────────────────────────────────────────
    const deleteResult: ApiResult<void> = await apiClient.delete(
      `${BOOKINGS_ENDPOINT}/${bookingid}`,
      AUTH_COOKIE(authToken),
    );

    // ── Assert: delete succeeded ─────────────────────────────────────────────────
    expect(deleteResult.ok, 'DELETE /booking/:id with valid auth should return 2xx').toBe(
      true,
    );

    // ── Verify: subsequent GET returns 404 ────────────────────────────────────────
    const verifyResult: ApiResult<Booking> = await apiClient.get<Booking>(
      `${BOOKINGS_ENDPOINT}/${bookingid}`,
      { Accept: 'application/json' },
    );

    expect(verifyResult.ok, 'GET after deletion should NOT return 2xx').toBe(false);

    if (verifyResult.ok) return; // narrow type

    expect(verifyResult.status).toBe(404);
  });

  test('DELETE without auth should return 403 @api', async ({ apiClient, authToken }) => {
    // ── Arrange: create a fresh booking ──────────────────────────────────────────
    const payload: Booking = new BookingBuilder()
      .withGuest('NoAuth', 'Delete')
      .withTotalPrice(60)
      .withDepositPaid(false)
      .withDates('2027-05-01', '2027-05-04')
      .build();

    const createResult: ApiResult<CreateBookingResponse> =
      await apiClient.post<CreateBookingResponse>(BOOKINGS_ENDPOINT, payload, JSON_HEADERS);

    expect(createResult.ok, 'Pre-condition: booking creation must succeed').toBe(true);

    if (!createResult.ok) return;

    const { bookingid } = createResult.data;

    // ── Act: DELETE without Cookie header ─────────────────────────────────────────
    const deleteResult: ApiResult<void> = await apiClient.delete(
      `${BOOKINGS_ENDPOINT}/${bookingid}`,
      // deliberately omits AUTH_COOKIE
    );

    // ── Assert: 403 Forbidden ─────────────────────────────────────────────────────
    expect(deleteResult.ok, 'DELETE without auth should NOT return 2xx').toBe(false);

    if (deleteResult.ok) return; // narrow type

    expect(deleteResult.status).toBe(403);

    // ── Cleanup: delete properly with auth so the resource is not left dangling ───
    await apiClient.delete(`${BOOKINGS_ENDPOINT}/${bookingid}`, AUTH_COOKIE(authToken));
  });
});
