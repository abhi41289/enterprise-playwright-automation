/**
 * @file tests/e2e/login.spec.ts
 * @purpose SauceDemo login page tests — valid/invalid credentials, locked user, URL guard.
 *          Covers the full authentication surface: happy path, credential errors, empty-field
 *          validation, and account-level lockout.
 * @pattern Page Object Model — all interactions are mediated by `LoginPage`; no raw selectors
 *          or Playwright calls appear inside test bodies.
 *
 * SOLID principles satisfied:
 *
 * SRP — Single Responsibility Principle:
 *   This file owns one concern: exercising the SauceDemo login screen.  Cart, inventory,
 *   and checkout behaviours live in their own spec files.
 *
 * OCP — Open/Closed Principle:
 *   New login scenarios are added as additional `test()` calls; the existing tests and
 *   the LoginPage class remain untouched.
 *
 * DIP — Dependency Inversion Principle:
 *   Tests depend on the `LoginPage` abstraction, not on raw `page.locator()` calls.
 *   Credential data is sourced via `TestDataFactory`, not inline literals.
 */

import { test } from '../../fixtures';
import { LoginPage } from '../../pages/LoginPage';
import { TestDataFactory } from '../../helpers/TestDataFactory';

// ─── Constants ──────────────────────────────────────────────────────────────────
// Centralised here: a copy-change on SauceDemo is a one-line update in this file.

/** SauceDemo exact error text for a username/password mismatch. */
const ERROR_INVALID_CREDENTIALS = 'Username and password do not match';

/** SauceDemo exact error text when the username field is submitted blank. */
const ERROR_USERNAME_REQUIRED = 'Username is required';

/** SauceDemo exact error text when the password field is submitted blank. */
const ERROR_PASSWORD_REQUIRED = 'Password is required';

/** SauceDemo exact error text for a locked account. */
const ERROR_LOCKED_OUT = 'Sorry, this user has been locked out';

/** A username that does not exist in SauceDemo — used for the invalid-user test. */
const UNKNOWN_USERNAME = 'invalid_user';

/** The standard SauceDemo shared password — used alongside an unknown username. */
const SAUCE_PASSWORD = 'secret_sauce';

/** A deliberately incorrect password — used alongside a valid username. */
const WRONG_PASSWORD = 'wrong_password';

// ─── Test Suite ─────────────────────────────────────────────────────────────────

/**
 * Login suite — exercises every documented credential scenario on the SauceDemo
 * login screen.  Uses the bare `test` fixture (unauthenticated) because these tests
 * must interact with the login form themselves; the `loggedInPage` fixture is reserved
 * for post-authentication tests.
 */
test.describe('SauceDemo — Login', { tag: ['@smoke', '@e2e'] }, () => {
  // ── Test 1: Happy path ─────────────────────────────────────────────────────────

  test(
    'should login successfully with valid standard credentials @smoke @e2e',
    async ({ page }) => {
      // Arrange — instantiate the page object and navigate to the login screen
      const loginPage = new LoginPage(page);
      await loginPage.navigateTo('/');

      // Act — log in using the standard user credential bundle
      await loginPage.loginAs(TestDataFactory.create('standard'));

      // Assert — a successful login redirects the browser to /inventory
      await loginPage.assertLoggedIn();
    },
  );

  // ── Test 2: Invalid username ───────────────────────────────────────────────────

  test('should display error for invalid username @e2e', async ({ page }) => {
    // Arrange
    const loginPage = new LoginPage(page);
    await loginPage.navigateTo('/');

    // Act — attempt login with a username that does not exist in SauceDemo
    await loginPage.login(UNKNOWN_USERNAME, SAUCE_PASSWORD);

    // Assert — error banner contains the credential-mismatch message
    await loginPage.assertLoginError(ERROR_INVALID_CREDENTIALS);
  });

  // ── Test 3: Invalid password ───────────────────────────────────────────────────

  test('should display error for invalid password @e2e', async ({ page }) => {
    // Arrange
    const loginPage = new LoginPage(page);
    await loginPage.navigateTo('/');

    // Act — attempt login with the correct username but a wrong password
    await loginPage.login(TestDataFactory.create('standard').username, WRONG_PASSWORD);

    // Assert — same mismatch error as an invalid username (SauceDemo does not distinguish)
    await loginPage.assertLoginError(ERROR_INVALID_CREDENTIALS);
  });

  // ── Test 4: Empty username ─────────────────────────────────────────────────────

  test('should display error for empty username @e2e', async ({ page }) => {
    // Arrange
    const loginPage = new LoginPage(page);
    await loginPage.navigateTo('/');

    // Act — submit with a blank username; SauceDemo validates the field client-side
    await loginPage.login('', SAUCE_PASSWORD);

    // Assert — field-level validation message for a missing username
    await loginPage.assertLoginError(ERROR_USERNAME_REQUIRED);
  });

  // ── Test 5: Empty password ─────────────────────────────────────────────────────

  test('should display error for empty password @e2e', async ({ page }) => {
    // Arrange
    const loginPage = new LoginPage(page);
    await loginPage.navigateTo('/');

    // Act — submit with a blank password; username is valid
    await loginPage.login(TestDataFactory.create('standard').username, '');

    // Assert — field-level validation message for a missing password
    await loginPage.assertLoginError(ERROR_PASSWORD_REQUIRED);
  });

  // ── Test 6: Locked account ─────────────────────────────────────────────────────

  test('should block locked_out_user from logging in @e2e', async ({ page }) => {
    // Arrange
    const loginPage = new LoginPage(page);
    await loginPage.navigateTo('/');

    // Act — attempt login as the account that SauceDemo has permanently locked
    await loginPage.loginAs(TestDataFactory.create('locked'));

    // Assert — account-level lockout message is displayed
    await loginPage.assertLoginError(ERROR_LOCKED_OUT);
  });
});
