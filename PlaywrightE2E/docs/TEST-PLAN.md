# Test Plan — Enterprise Playwright Automation Framework

**Version:** 1.0
**Date:** 2026-03-10
**Author:** SDET
**Status:** Active

---

## 1. Objectives

- Validate end-to-end user journeys on SauceDemo (login, product selection, cart, checkout).
- Validate CRUD operations and authentication on the Restful-Booker API.
- Verify combined E2E flows where API state seeds UI tests.
- Capture Core Web Vitals (LCP, CLS, FID) on key SauceDemo pages.

---

## 2. Scope

### In Scope

| Layer | Application | Coverage |
| --- | --- | --- |
| UI E2E | SauceDemo | Login, product browsing, cart, checkout, logout |
| API | Restful-Booker | Auth token, GET/POST/PUT/PATCH/DELETE bookings |
| E2E (hybrid) | Both | API-seeded bookings verified via UI |
| Visual regression | SauceDemo | Homepage, product page, cart, checkout |
| Performance | SauceDemo | LCP, CLS, FID on login and inventory pages |

### Out of Scope

- SauceDemo backend / database internals (black-box testing only).
- Load / stress testing (not covered by Playwright).
- Mobile native apps.

---

## 3. Test Approach

**Testing pyramid:**

- Unit tests — not in scope (framework tests, not application unit tests).
- API tests — Restful-Booker CRUD; fast, isolated, no browser needed.
- UI tests — SauceDemo user journeys via Page Object Model.
- E2E tests — API establishes state; UI verifies user-visible outcome.

**Hybrid UI+API pattern:**
Where possible, use API calls for test *setup* and teardown, and UI only for the behaviour under test. This minimises brittle UI setup steps and speeds up suites.

---

## 4. Entry Criteria

- `npm install && npx playwright install` completes without errors.
- `.env` populated with valid credentials (see `.env.example`).
- Target applications (SauceDemo, Restful-Booker) are reachable from the test runner.
- All Phase 1 config files committed and `npm run validate` passes.

---

## 5. Exit Criteria

- All smoke tests pass across Chromium, Firefox, and WebKit.
- No test failures in the regression suite on the main branch.
- HTML report generated with 0 unexpected failures.
- CI pipeline (GitHub Actions) green on merge to `main`.

---

## 6. Test Data Strategy

- **SauceDemo credentials** — sourced from `.env`; multiple user types exercised (`standard_user`, `locked_out_user`, `problem_user`).
- **Restful-Booker payloads** — generated via `TestDataFactory` (Phase 2) using the Builder pattern; no hard-coded payloads in test files.
- **Cleanup** — API tests delete created bookings in `afterEach`; UI tests rely on SauceDemo's stateless session (no persistent data).

---

## 7. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| SauceDemo UI changes breaking locators | Low | High | Centralise all selectors in Page Objects; self-healing locator strategy |
| Restful-Booker API downtime | Medium | High | Use `test.skip` with clear message if health-check endpoint fails |
| Flaky tests from network latency | Medium | Medium | Playwright auto-waiting; no `waitForTimeout`; retry once on CI |
| Cross-browser inconsistencies | Low | Medium | Run E2E suite on all three engines; isolate browser-specific issues with tags |

---

## 8. Tools and Environment

| Tool | Version | Purpose |
| --- | --- | --- |
| Playwright | ^1.44 | Test runner, browser automation, API client |
| TypeScript | ^5.4 | Type-safe test authoring |
| ESLint + Prettier | Latest | Code quality gate |
| Docker | Latest | Containerised CI execution |
| GitHub Actions | — | CI/CD pipeline |

---

## 9. Defect Management

- Defects found during automation development raised as GitHub Issues.
- Severity: `critical` / `high` / `medium` / `low` labels.
- All `critical` and `high` defects must be resolved before exit criteria are met.
