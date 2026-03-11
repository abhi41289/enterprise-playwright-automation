/**
 * @file data/types.ts
 * @purpose Shared TypeScript type definitions for the enterprise Playwright framework.
 *          All domain models, API response shapes, and UI data structures are declared
 *          here as the single source of truth — imported by page objects, fixtures, and tests.
 * @pattern Discriminated Unions — `SauceUserKind` and `ApiResult<T>` use literal-type
 *          discriminants so TypeScript can narrow exhaustively without casting.
 */

// ─── SauceDemo Domain ──────────────────────────────────────────────────────────

/** Discriminant literal union identifying every SauceDemo credential set. */
export type SauceUserKind = 'standard' | 'locked' | 'problem' | 'performance_glitch';

/**
 * Represents a SauceDemo user credential bundle.
 * The `kind` field acts as the discriminant for exhaustive narrowing.
 */
export interface SauceUser {
  kind: SauceUserKind;
  username: string;
  password: string;
}

// ─── Cart & Checkout Domain ────────────────────────────────────────────────────

/** A single line item extracted from the SauceDemo cart page. */
export interface CartItem {
  name: string;
  price: number;
  quantity: number;
}

/** Form data required to complete SauceDemo checkout step one. */
export interface CheckoutInfo {
  firstName: string;
  lastName: string;
  postalCode: string;
}

// ─── Restful-Booker API Domain ─────────────────────────────────────────────────

/** Check-in / check-out date strings in YYYY-MM-DD format. */
export interface BookingDates {
  checkin: string;
  checkout: string;
}

/** Full booking payload as accepted and returned by the Restful-Booker API. */
export interface Booking {
  firstname: string;
  lastname: string;
  totalprice: number;
  depositpaid: boolean;
  bookingdates: BookingDates;
  additionalneeds?: string;
}

/** Response body from `POST /booking` — wraps the created booking with its assigned ID. */
export interface CreateBookingResponse {
  bookingid: number;
  booking: Booking;
}

/**
 * Response body from `POST /auth`.
 * On success:  { token: string }
 * On failure:  { reason: string }  — e.g. { reason: "Bad credentials" }
 * Both fields are optional because the API sends exactly one of them, never both.
 */
export interface AuthResponse {
  token?: string;
  reason?: string;
}

// ─── Generic Utility Types ─────────────────────────────────────────────────────

/**
 * Discriminated-union wrapper for all API call outcomes.
 * Consumers MUST check `result.ok` before accessing `result.data`
 * — the compiler enforces this via narrowing.
 *
 * @example
 * const result: ApiResult<Booking> = await fetchBooking(id);
 * if (result.ok) {
 *   console.log(result.data.firstname); // safe
 * } else {
 *   console.error(result.status, result.error);
 * }
 */
export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string };
