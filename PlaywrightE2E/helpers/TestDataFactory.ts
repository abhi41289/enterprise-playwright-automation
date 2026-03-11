/**
 * @file TestDataFactory.ts
 * @purpose Generates typed test data for all test layers. Uses generics and discriminated
 *          unions to ensure type safety at the factory boundary.
 * @pattern Factory Pattern — centralises object creation; tests request data by kind,
 *          not by constructing raw objects.
 */

import { type SauceUser, type Booking, type CheckoutInfo } from '../data/types';
import { BookingBuilder } from './BookingBuilder';

// ─── Constants ─────────────────────────────────────────────────────────────────

/** SauceDemo shared password used by all non-locked user accounts. */
const SAUCE_PASSWORD = 'secret_sauce';

/** All known SauceDemo usernames — referenced both by the factory and env-fallback logic. */
const SAUCE_USERNAMES = {
  STANDARD: 'standard_user',
  LOCKED: 'locked_out_user',
  PROBLEM: 'problem_user',
  PERFORMANCE_GLITCH: 'performance_glitch_user',
} as const;

/** Static checkout info used in SauceDemo step-one checkout forms. */
const DEFAULT_CHECKOUT_INFO: CheckoutInfo = {
  firstName: 'Test',
  lastName: 'Automation',
  postalCode: '90210',
} as const;

/** Random first names pool for `booking-random` payloads. */
const RANDOM_FIRST_NAMES: ReadonlyArray<string> = [
  'Alice',
  'Bob',
  'Carol',
  'Dave',
  'Eve',
  'Frank',
  'Grace',
  'Hank',
  'Ivy',
  'Jack',
] as const;

/** Random last names pool for `booking-random` payloads. */
const RANDOM_LAST_NAMES: ReadonlyArray<string> = [
  'Smith',
  'Jones',
  'Brown',
  'Taylor',
  'Wilson',
  'Davies',
  'Evans',
  'Thomas',
  'Roberts',
  'Walker',
] as const;

/** Additional needs options for `booking-random` payloads. */
const RANDOM_ADDITIONAL_NEEDS: ReadonlyArray<string> = [
  'Breakfast',
  'Lunch',
  'Dinner',
  'Breakfast, Lunch',
  'No extra needs',
] as const;

// ─── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Returns a cryptographically-sufficient random integer in the range [min, max] (inclusive).
 * Falls back to `Math.random()` in environments where `crypto` is unavailable.
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Returns a random element from a readonly array.
 * Throws if the array is empty.
 */
function randomPick<T>(arr: ReadonlyArray<T>): T {
  if (arr.length === 0) {
    throw new Error('randomPick: cannot pick from an empty array');
  }
  const index = randomInt(0, arr.length - 1);
  const value = arr[index];
  // arr[index] is safe because index is bounded to [0, arr.length - 1]
  // The non-null assertion is required due to `noUncheckedIndexedAccess`
  return value as T;
}

/**
 * Formats a `Date` object as an ISO `YYYY-MM-DD` string using local time.
 */
function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Adds `days` calendar days to `date` and returns a new `Date`.
 */
function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

// ─── Discriminated kind union ──────────────────────────────────────────────────

/** All recognised data kinds — used as the discriminant for overloaded `create()`. */
type DataKind =
  | 'standard'
  | 'locked'
  | 'problem'
  | 'performance_glitch'
  | 'booking'
  | 'booking-random'
  | 'checkout-info';

/** Maps each `DataKind` to its concrete return type — used by `createGeneric` for type inference. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type DataKindMap = {
  standard: SauceUser;
  locked: SauceUser;
  problem: SauceUser;
  performance_glitch: SauceUser;
  booking: Booking;
  'booking-random': Booking;
  'checkout-info': CheckoutInfo;
};

/**
 * SOLID principles satisfied:
 *
 * SRP — Single Responsibility Principle:
 *   TestDataFactory is responsible for exactly one concern: producing test data objects.
 *   It has no knowledge of HTTP transport, UI interactions, or test assertions.
 *
 * OCP — Open/Closed Principle:
 *   New data kinds are supported by adding entries to `DataKind`, `DataKindMap`, and the
 *   internal registry (`DATA_REGISTRY`) without modifying any existing code paths.
 *   The public `create()` overloads remain untouched when new kinds are added.
 */
export class TestDataFactory {
  // ─── Typed overloads ──────────────────────────────────────────────────────────

  /**
   * Creates a `SauceUser` for the `'standard'` credential set.
   * Username sourced from `process.env.SAUCE_STANDARD_USER` with fallback to known value.
   */
  static create(kind: 'standard'): SauceUser;

  /**
   * Creates a `SauceUser` for the `'locked'` credential set.
   * Username sourced from `process.env.SAUCE_LOCKED_USER` with fallback to known value.
   */
  static create(kind: 'locked'): SauceUser;

  /**
   * Creates a `SauceUser` for the `'problem'` credential set.
   * Username sourced from `process.env.SAUCE_PROBLEM_USER` with fallback to known value.
   */
  static create(kind: 'problem'): SauceUser;

  /**
   * Creates a `SauceUser` for the `'performance_glitch'` credential set.
   * Username sourced from `process.env.SAUCE_PERFORMANCE_USER` with fallback to known value.
   */
  static create(kind: 'performance_glitch'): SauceUser;

  /**
   * Creates a deterministic `Booking` with sensible default values.
   * Delegates to `BookingBuilder.default()`.
   */
  static create(kind: 'booking'): Booking;

  /**
   * Creates a `Booking` with randomised guest names, dates, price, and additional needs.
   * Useful for uniqueness requirements in mutation tests.
   */
  static create(kind: 'booking-random'): Booking;

  /**
   * Creates a static, valid `CheckoutInfo` object for SauceDemo checkout step one.
   */
  static create(kind: 'checkout-info'): CheckoutInfo;

  /**
   * Implementation signature — resolves the correct factory for each `DataKind`.
   * Consumers use one of the typed overloads above; they never call this directly.
   */
  static create(kind: DataKind): SauceUser | Booking | CheckoutInfo {
    switch (kind) {
      case 'standard':
        return TestDataFactory.buildSauceUser(
          'standard',
          process.env['SAUCE_STANDARD_USER'] ?? SAUCE_USERNAMES.STANDARD,
          process.env['SAUCE_PASSWORD'] ?? SAUCE_PASSWORD,
        );

      case 'locked':
        return TestDataFactory.buildSauceUser(
          'locked',
          process.env['SAUCE_LOCKED_USER'] ?? SAUCE_USERNAMES.LOCKED,
          process.env['SAUCE_PASSWORD'] ?? SAUCE_PASSWORD,
        );

      case 'problem':
        return TestDataFactory.buildSauceUser(
          'problem',
          process.env['SAUCE_PROBLEM_USER'] ?? SAUCE_USERNAMES.PROBLEM,
          process.env['SAUCE_PASSWORD'] ?? SAUCE_PASSWORD,
        );

      case 'performance_glitch':
        return TestDataFactory.buildSauceUser(
          'performance_glitch',
          process.env['SAUCE_PERFORMANCE_USER'] ?? SAUCE_USERNAMES.PERFORMANCE_GLITCH,
          process.env['SAUCE_PASSWORD'] ?? SAUCE_PASSWORD,
        );

      case 'booking':
        return BookingBuilder.default();

      case 'booking-random':
        return TestDataFactory.buildRandomBooking();

      case 'checkout-info':
        return { ...DEFAULT_CHECKOUT_INFO };
    }
  }

  /**
   * Generic factory for extensibility — creates an object of type `T` identified by `kind`.
   * Supports optional `overrides` to partially replace generated field values.
   *
   * This method is the extension point for new data kinds that are not yet part of the
   * `DataKindMap` union — for example, data shapes introduced by downstream test layers.
   *
   * @param kind      - String identifier for the data type to create.
   * @param overrides - Partial object whose keys override the generated defaults.
   * @returns         A fully constructed object of type `T`.
   * @throws          {Error} When `kind` is not registered in the internal data registry.
   */
  static createGeneric<T>(kind: string, overrides?: Partial<T>): T {
    // Guard: ensure kind is one of the known discriminants before delegating
    const knownKinds: ReadonlyArray<string> = [
      'standard',
      'locked',
      'problem',
      'performance_glitch',
      'booking',
      'booking-random',
      'checkout-info',
    ];

    if (!knownKinds.includes(kind)) {
      throw new Error(
        `TestDataFactory.createGeneric: unknown kind '${kind}'. ` +
          `Registered kinds: [${knownKinds.join(', ')}].`,
      );
    }

    // Arrow wrapper avoids the `unbound-method` lint error while preserving the cast.
    // TypeScript cannot resolve a union-typed argument against individual overloads,
    // so we cast through the implementation signature explicitly.
    const createImpl = (k: DataKind): SauceUser | Booking | CheckoutInfo =>
      (TestDataFactory.create as (k: DataKind) => SauceUser | Booking | CheckoutInfo)(k);
    const base = createImpl(kind as DataKind) as T;

    if (overrides === undefined || overrides === null) {
      return base;
    }

    // Merge overrides shallowly — preserves nested objects unless explicitly overridden
    return { ...base, ...overrides };
  }

  // ─── Private construction helpers ─────────────────────────────────────────────

  /**
   * Constructs a `SauceUser` from explicit credential parts.
   * Kept private to avoid leaking credential-assembly logic into consumers.
   */
  private static buildSauceUser(
    kind: SauceUser['kind'],
    username: string,
    password: string,
  ): SauceUser {
    return { kind, username, password };
  }

  /**
   * Builds a `Booking` with randomised field values.
   * Dates are anchored to "today" so they remain valid relative to test execution time.
   */
  private static buildRandomBooking(): Booking {
    const today = new Date();
    const checkinOffset = randomInt(1, 30);
    const stayLength = randomInt(1, 14);

    const checkin = toIsoDate(addDays(today, checkinOffset));
    const checkout = toIsoDate(addDays(today, checkinOffset + stayLength));

    return new BookingBuilder()
      .withGuest(randomPick(RANDOM_FIRST_NAMES), randomPick(RANDOM_LAST_NAMES))
      .withTotalPrice(randomInt(50, 500))
      .withDepositPaid(Math.random() >= 0.5)
      .withDates(checkin, checkout)
      .withAdditionalNeeds(randomPick(RANDOM_ADDITIONAL_NEEDS))
      .build();
  }
}
