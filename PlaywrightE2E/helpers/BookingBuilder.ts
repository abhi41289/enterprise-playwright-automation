/**
 * @file BookingBuilder.ts
 * @purpose Constructs Restful-Booker booking payloads using the Builder pattern.
 *          Eliminates scattered object literals in test files.
 * @pattern Builder Pattern — separates construction of a complex object from its representation.
 */

import { type Booking, type BookingDates } from '../data/types';

/** Fields that are mandatory before `build()` may succeed. */
const REQUIRED_FIELDS: ReadonlyArray<keyof Booking> = [
  'firstname',
  'lastname',
  'totalprice',
  'depositpaid',
  'bookingdates',
] as const;

/**
 * SOLID principles satisfied:
 *
 * SRP — Single Responsibility Principle:
 *   BookingBuilder owns exactly one concern: constructing `Booking` payloads.
 *   It has no knowledge of HTTP transport, test assertions, or credential management.
 *
 * OCP — Open/Closed Principle:
 *   New booking fields (e.g. a hypothetical `roomType` property) can be supported by
 *   adding a new setter method.  Existing setters are never modified — the class is
 *   closed for modification but open for extension.
 */
export class BookingBuilder {
  /** Accumulates field values as they are set by the fluent API. */
  private booking: Partial<Booking> = {};

  /**
   * Sets the guest's first name.
   *
   * @param name - Guest first name (non-empty string expected).
   * @returns `this` — enables method chaining.
   */
  withFirstName(name: string): this {
    this.booking.firstname = name;
    return this;
  }

  /**
   * Sets the guest's last name.
   *
   * @param name - Guest last name (non-empty string expected).
   * @returns `this` — enables method chaining.
   */
  withLastName(name: string): this {
    this.booking.lastname = name;
    return this;
  }

  /**
   * Convenience setter that assigns both first and last name in a single call.
   *
   * @param firstName - Guest first name.
   * @param lastName  - Guest last name.
   * @returns `this` — enables method chaining.
   */
  withGuest(firstName: string, lastName: string): this {
    this.booking.firstname = firstName;
    this.booking.lastname = lastName;
    return this;
  }

  /**
   * Sets the total price of the booking.
   *
   * @param price - Non-negative integer representing the total cost.
   * @returns `this` — enables method chaining.
   */
  withTotalPrice(price: number): this {
    this.booking.totalprice = price;
    return this;
  }

  /**
   * Sets whether a deposit has been paid.
   *
   * @param paid - `true` if deposit is paid, `false` otherwise.
   * @returns `this` — enables method chaining.
   */
  withDepositPaid(paid: boolean): this {
    this.booking.depositpaid = paid;
    return this;
  }

  /**
   * Sets the check-in and check-out dates.
   *
   * @param checkin  - ISO date string in `YYYY-MM-DD` format.
   * @param checkout - ISO date string in `YYYY-MM-DD` format. Must be ≥ `checkin`.
   * @returns `this` — enables method chaining.
   */
  withDates(checkin: string, checkout: string): this {
    const dates: BookingDates = { checkin, checkout };
    this.booking.bookingdates = dates;
    return this;
  }

  /**
   * Sets any additional needs or special requests for the booking.
   *
   * @param needs - Free-text description (e.g. `'Breakfast'`).
   * @returns `this` — enables method chaining.
   */
  withAdditionalNeeds(needs: string): this {
    this.booking.additionalneeds = needs;
    return this;
  }

  /**
   * Validates accumulated state and returns a fully typed `Booking` object.
   *
   * Validation rules:
   * - All five required fields (`firstname`, `lastname`, `totalprice`,
   *   `depositpaid`, `bookingdates`) must be present.
   * - Throws a descriptive `Error` identifying every missing field so the
   *   developer can fix the builder call without guessing.
   *
   * @throws {Error} When one or more required fields have not been set.
   * @returns A complete, validated `Booking` object ready for API submission.
   */
  build(): Booking {
    const missingFields = REQUIRED_FIELDS.filter(
      (field) => this.booking[field] === undefined || this.booking[field] === null,
    );

    if (missingFields.length > 0) {
      throw new Error(
        `BookingBuilder.build() failed — the following required fields are missing: ` +
          `[${missingFields.join(', ')}]. ` +
          `Call the corresponding setter(s) before invoking build().`,
      );
    }

    // At this point all required fields are guaranteed to be set.
    // The cast is safe because we have validated presence of all required keys.
    return this.booking as Booking;
  }

  /**
   * Static factory that returns a minimal but fully valid `Booking` with sensible defaults.
   * Intended for tests that need a valid payload without caring about specific values.
   *
   * Default values:
   * - Guest: `John Doe`
   * - Total price: `150`
   * - Deposit paid: `true`
   * - Dates: tomorrow → day-after-tomorrow (relative to test execution date)
   * - Additional needs: `Breakfast`
   *
   * @returns A complete `Booking` built from default values.
   */
  static default(): Booking {
    const today = new Date();
    const checkin = BookingBuilder.toIsoDateString(
      new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000),
    );
    const checkout = BookingBuilder.toIsoDateString(
      new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000),
    );

    return new BookingBuilder()
      .withGuest('John', 'Doe')
      .withTotalPrice(150)
      .withDepositPaid(true)
      .withDates(checkin, checkout)
      .withAdditionalNeeds('Breakfast')
      .build();
  }

  /**
   * Formats a `Date` as an ISO `YYYY-MM-DD` string (local date, not UTC).
   *
   * @param date - The date to format.
   * @returns String in `YYYY-MM-DD` format.
   */
  private static toIsoDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
