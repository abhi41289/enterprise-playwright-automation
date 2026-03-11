# Enterprise Playwright Automation Framework

TypeScript + Playwright + Docker automation framework demonstrating production-grade patterns for UI, API, and E2E testing.

| Layer | Target | Tool |
| --- | --- | --- |
| UI | [SauceDemo](https://www.saucedemo.com) | Playwright |
| API | [Restful-Booker](https://restful-booker.herokuapp.com) | Playwright `APIRequestContext` |
| E2E | SauceDemo + Restful-Booker | Playwright (UI + API combined) |
| Performance | SauceDemo | Playwright + `web-vitals` injection |

## Architecture

```
├── pages/          # Page Object Model — one class per page
├── helpers/        # API helper (Builder pattern), data factories
├── fixtures/       # Custom Playwright fixtures (auth, API client)
├── tests/
│   ├── e2e/        # UI flows (SauceDemo: login → cart → checkout)
│   ├── api/        # API-only tests (Restful-Booker CRUD)
│   └── visual/     # Visual regression tests
├── data/           # Static test data & type definitions
└── docs/           # TEST-PLAN.md, TEST-STRATEGY.md, ADO-MAPPING.md
```

**Design patterns applied:**

- **Page Object Model (POM)** — all UI interactions encapsulated in `pages/`
- **Builder Pattern** — `BookingBuilder` constructs API request payloads fluently
- **Factory Pattern** — `TestDataFactory` generates typed test data with generics

## Local Setup

### Prerequisites

- Node.js >= 18
- Docker (for containerised runs)

### Install

```bash
npm install
npx playwright install --with-deps
cp .env.example .env   # Fill in values if overriding defaults
```

### Run Tests

```bash
# All tests (headless, all browsers)
npm test

# Specific layer
npm run test:api
npm run test:e2e

# By tag
npm run test:smoke
npm run test:regression

# Headed (visible browser)
npm run test:headed

# Playwright UI mode (interactive test runner)
npm run test:ui

# Single file
npx playwright test tests/e2e/login.spec.ts --headed

# Debug mode
npm run test:debug
```

### Reports & Tracing

```bash
npm run test:report                           # Open HTML report
npx playwright show-trace test-results/<trace>.zip
```

### Code Quality

```bash
npm run type-check     # TypeScript strict check
npm run lint           # ESLint (zero warnings policy)
npm run format         # Prettier write
npm run validate       # type-check + lint + format:check (pre-commit gate)
```

## Run in Docker

```bash
# Build image
docker build -t playwright-framework .

# Run all tests
docker run --rm playwright-framework

# Run with report extraction
docker run --rm -v $(pwd)/playwright-report:/app/playwright-report playwright-framework
```

## Project Structure — Key Decisions

| Decision | Rationale |
| --- | --- |
| `noEmit: true` in tsconfig | Playwright transpiles at runtime; tsc is type-check only |
| Separate `api` project in playwright.config | API tests run once (Chromium), not cross-browser |
| Fixtures over `beforeEach` for auth | Fixtures compose cleanly; `beforeEach` creates hidden coupling |
| `unknown` + type guards instead of `any` | Forces explicit validation at system boundaries |
| dotenv in playwright.config.ts | Single load point; all test files get env vars automatically |

## Phases

| # | Phase | Status |
| --- | --- | --- |
| 1 | Setup & Documentation | Complete |
| 2 | Core Architecture | Pending |
| 3 | API Tests | Pending |
| 4 | UI Tests | Pending |
| 5 | E2E Flows | Pending |
| 6 | CI/CD & Docker | Pending |

See [docs/TEST-PLAN.md](docs/TEST-PLAN.md) and [docs/TEST-STRATEGY.md](docs/TEST-STRATEGY.md) for formal test planning documents.
