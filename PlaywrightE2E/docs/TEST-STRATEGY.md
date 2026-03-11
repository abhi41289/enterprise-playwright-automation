# Test Strategy — Enterprise Playwright Automation Framework

**Version:** 1.0
**Date:** 2026-03-10

---

## 1. Testing Pyramid

```
        ▲ E2E (hybrid)      — slowest, highest confidence, fewest
       ▲▲▲ UI (POM)         — cross-browser, user-journey focus
      ▲▲▲▲▲ API             — fast, deterministic, no browser
```

Rationale: API tests give fast feedback on contract compliance. UI tests validate user journeys. E2E tests confirm integrated behaviour. The pyramid shape keeps suite runtime manageable.

---

## 2. Tools and Rationale

| Tool | Rationale |
| --- | --- |
| **Playwright** | Native multi-browser, built-in API client, auto-waiting, trace viewer, no extra dependencies |
| **TypeScript strict** | Catches contract mismatches at compile time; eliminates entire classes of runtime errors |
| **ESLint `playwright` plugin** | Enforces no `waitForTimeout`, mandatory assertions — prevents common anti-patterns |
| **Docker** | Reproducible environment across dev machines and CI; pins browser versions |
| **GitHub Actions** | Tight integration with repo; matrix builds for cross-browser CI |

---

## 3. Design Patterns

### Page Object Model (POM)

Every page in SauceDemo has a corresponding class in `pages/`. Tests never call `page.locator()` directly.

```
BasePage          ← shared waits, error/success message helpers
  └── LoginPage
  └── InventoryPage
  └── CartPage
  └── CheckoutPage
```

**Why:** Decouples selector changes from test logic. One locator update fixes all tests.

### Builder Pattern (API payloads)

`BookingBuilder` in `helpers/` constructs Restful-Booker request bodies fluently:

```typescript
const payload = new BookingBuilder()
  .withGuest('Jane', 'Doe')
  .withDates('2026-04-01', '2026-04-05')
  .withPrice(250)
  .build();
```

**Why:** Eliminates scattered object literals in tests; enforces valid payload structure via TypeScript; readable test intent.

### Factory Pattern (test data)

`TestDataFactory<T>` generates typed test data with randomisation, preventing test interdependence:

```typescript
const user = TestDataFactory.create<SauceUser>('standard');
const booking = TestDataFactory.create<Booking>('random');
```

**Why:** Tests that share hard-coded data are coupling; factories produce isolated, deterministic-enough data per test run.

---

## 4. Tagging Strategy

Tests are tagged in `test.describe` or individual `test()` calls:

| Tag | Meaning | When to run |
| --- | --- | --- |
| `@smoke` | Critical-path, fast | Every PR, every merge |
| `@regression` | Full suite | Nightly, pre-release |
| `@api` | API-only tests | Every PR (fast) |
| `@visual` | Visual regression | On UI-change PRs |
| `@slow` | Long-running scenarios | Nightly only |

---

## 5. Parallelism and Isolation

- Tests are **fully isolated** — no shared mutable state between tests.
- `beforeEach` / `afterEach` used for per-test setup only; global state set via fixtures.
- Playwright runs workers in parallel by default; tests designed to support this.
- API tests create and delete their own booking records to avoid ordering dependencies.

---

## 6. Failure Handling

| Scenario | Behaviour |
| --- | --- |
| Test fails on first run (CI) | Retry once (`retries: 1`) |
| Test fails on retry | Mark as failed; capture trace + video + screenshot |
| External service unreachable | `test.skip` with descriptive message (not a hard failure) |
| `waitForTimeout` detected | ESLint error — blocked at lint stage, never reaches CI |

---

## 7. Reporting

- **Local:** HTML report opens automatically on failure (`open: 'on-failure'`).
- **CI:** HTML report uploaded as a GitHub Actions artifact on every run; `list` reporter in stdout for readability.
- **Traces:** `.zip` trace files attached to failed tests; viewable via `npx playwright show-trace`.

---

## 8. CI/CD Integration

See [ADO-MAPPING.md](ADO-MAPPING.md) (Phase 6) for GitHub Actions → Azure DevOps concept mapping.

Pipeline stages:

```
lint → type-check → test (headless, Docker) → upload artifacts
```

- Tests run inside the official `mcr.microsoft.com/playwright` Docker image.
- Browser binaries are pre-installed in the image — no `npx playwright install` in CI.
- `forbidOnly: true` on CI prevents accidentally committed `.only` tests from blocking the pipeline.
