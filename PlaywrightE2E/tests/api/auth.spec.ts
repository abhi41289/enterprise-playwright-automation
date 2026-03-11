/**
 * @file tests/api/auth.spec.ts
 * @purpose Validates the Restful-Booker POST /auth endpoint for all credential scenarios.
 *          Covers the happy path, three distinct failure paths, and fixture-level token usability.
 * @pattern Arrange-Act-Assert — each test is fully self-contained with explicit setup, a single
 *          HTTP call, and targeted assertions.  No shared mutable state between tests.
 */

import { test, expect } from '../../fixtures';
import { type ApiResult } from '../../data/types';
import { type AuthResponse } from '../../data/types';

// ─── Constants ──────────────────────────────────────────────────────────────────
// Centralised here so a credential rotation or endpoint rename is a one-line change.

/** Path for the Restful-Booker authentication endpoint. */
const AUTH_ENDPOINT = '/auth';

/** Valid admin username for Restful-Booker. Mirrors the fixture and .env fallback. */
const VALID_USERNAME = process.env['BOOKER_ADMIN_USER'] ?? 'admin';

/** Valid admin password for Restful-Booker. Mirrors the fixture and .env fallback. */
const VALID_PASSWORD = process.env['BOOKER_ADMIN_PASS'] ?? 'password123';

/**
 * Sentinel value returned in the `reason` field when credentials are rejected.
 * On success the API returns { token: string }.
 * On failure the API returns { reason: "Bad credentials" } — NOT in the token field.
 * The HTTP status is always 200 in both cases.
 */
const BAD_CREDENTIALS_REASON = 'Bad credentials';

// ─── Test Suite ─────────────────────────────────────────────────────────────────

test.describe('Restful-Booker — Authentication', { tag: ['@api'] }, () => {
  // ── Test 1: Happy path ─────────────────────────────────────────────────────────

  test('should return a valid token for valid credentials @smoke @api', async ({ apiClient }) => {
    // Arrange — valid admin credential bundle
    const credentials = { username: VALID_USERNAME, password: VALID_PASSWORD };

    // Act — POST /auth with correct credentials
    const result: ApiResult<AuthResponse> = await apiClient.post<AuthResponse>(
      AUTH_ENDPOINT,
      credentials,
    );

    // Assert — HTTP transport succeeded (2xx)
    expect(result.ok, 'Expected HTTP call to succeed (ok: true)').toBe(true);

    // TypeScript discriminated-union narrows `result` to the success branch here
    if (!result.ok) return;

    const { token } = result.data;

    // Assert — token is a non-empty string.
    // token is `string | undefined` (AuthResponse has both fields optional).
    // Using optional chaining so tsc --strict does not flag `.length` on undefined.
    // If token IS undefined, typeof check fails and length check produces 0 — both assertions fail.
    expect(typeof token, 'Expected token to be a string').toBe('string');
    expect(token?.length ?? 0, 'Expected token to be non-empty').toBeGreaterThan(0);

    // Assert — token is not the failure sentinel (failure uses `reason`, not `token`)
    expect(token, 'Expected token not to equal the bad-credentials sentinel').not.toBe(
      BAD_CREDENTIALS_REASON,
    );
  });

  // ── Test 2: Wrong username ─────────────────────────────────────────────────────

  test('should return Bad credentials for invalid username @api', async ({ apiClient }) => {
    // Arrange — wrong username, correct password
    const credentials = { username: 'wrong_user', password: VALID_PASSWORD };

    // Act — POST /auth with bad username
    const result: ApiResult<AuthResponse> = await apiClient.post<AuthResponse>(
      AUTH_ENDPOINT,
      credentials,
    );

    // Assert — API always returns HTTP 200 for auth, even on failure
    expect(
      result.ok,
      'Expected HTTP 200 (ok: true) even for bad credentials — the API uses the token value, not status code, to signal failure',
    ).toBe(true);

    if (!result.ok) return;

    // Assert — `reason` field contains the failure sentinel (not `token`, which is absent)
    expect(result.data.reason, 'Expected the bad-credentials sentinel in reason field').toBe(
      BAD_CREDENTIALS_REASON,
    );
  });

  // ── Test 3: Wrong password ─────────────────────────────────────────────────────

  test('should return Bad credentials for invalid password @api', async ({ apiClient }) => {
    // Arrange — correct username, wrong password
    const credentials = { username: VALID_USERNAME, password: 'wrong_password' };

    // Act — POST /auth with bad password
    const result: ApiResult<AuthResponse> = await apiClient.post<AuthResponse>(
      AUTH_ENDPOINT,
      credentials,
    );

    // Assert — HTTP 200 expected regardless of auth outcome
    expect(
      result.ok,
      'Expected HTTP 200 (ok: true) even for wrong password — status code is not the auth signal',
    ).toBe(true);

    if (!result.ok) return;

    // Assert — `reason` field contains the failure sentinel (not `token`, which is absent)
    expect(result.data.reason, 'Expected the bad-credentials sentinel in reason field').toBe(
      BAD_CREDENTIALS_REASON,
    );
  });

  // ── Test 4: Empty credentials ──────────────────────────────────────────────────

  test('should return Bad credentials for empty credentials @api', async ({ apiClient }) => {
    // Arrange — both fields intentionally blank; tests the API's null/empty guard
    const credentials = { username: '', password: '' };

    // Act — POST /auth with empty strings
    const result: ApiResult<AuthResponse> = await apiClient.post<AuthResponse>(
      AUTH_ENDPOINT,
      credentials,
    );

    // Assert — HTTP 200 regardless of credential validity
    expect(result.ok, 'Expected HTTP 200 (ok: true) for empty-credential request').toBe(true);

    if (!result.ok) return;

    // Assert — `reason` field contains the failure sentinel (not `token`, which is absent)
    expect(result.data.reason, 'Expected the bad-credentials sentinel in reason field for empty credentials').toBe(
      BAD_CREDENTIALS_REASON,
    );
  });

  // ── Test 5: authToken fixture usability ───────────────────────────────────────

  test(
    'authToken fixture provides a usable token @smoke @api',
    async ({ authToken, apiClient }) => {
      // Assert — the fixture itself resolved to a valid, non-sentinel token
      expect(typeof authToken, 'Expected authToken fixture to resolve to a string').toBe('string');
      expect(authToken.length, 'Expected authToken fixture to be non-empty').toBeGreaterThan(0);
      expect(authToken, 'Expected authToken not to be the bad-credentials sentinel').not.toBe(
        BAD_CREDENTIALS_REASON,
      );

      // Act — use the fixture token to attempt a DELETE on a known booking path.
      //        Cookie-based auth is required by Restful-Booker for mutating requests.
      const deleteResult: ApiResult<void> = await apiClient.delete('/booking/1', {
        Cookie: `token=${authToken}`,
      });

      // Assert — two outcomes are both acceptable:
      //   204 No Content  → booking existed and was deleted successfully.
      //   405 Method Not Allowed → the DB was reset and booking/1 no longer exists.
      // In both cases the token itself is proven valid — a bad token returns 403.
      const isAcceptableOutcome =
        deleteResult.ok === true ||
        (deleteResult.ok === false && deleteResult.status === 405);

      expect(
        isAcceptableOutcome,
        `Expected DELETE /booking/1 to return 204 (deleted) or 405 (not found after DB reset), ` +
          `but got: ok=${String(deleteResult.ok)}, status=${deleteResult.ok ? 'n/a' : String(deleteResult.status)}`,
      ).toBe(true);
    },
  );
});
