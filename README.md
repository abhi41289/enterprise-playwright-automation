# Enterprise Playwright Automation Framework

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Playwright](https://img.shields.io/badge/Playwright-v1.40+-2EAD33?style=for-the-badge&logo=playwright&logoColor=white)](https://playwright.dev/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub_Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white)](https://github.com/abhi41289/enterprise-playwright-automation/actions)
[![Architected by](https://img.shields.io/badge/Architected_by-Abhishek_Raj_P-orange?style=for-the-badge&logo=github)](https://github.com/abhi41289)

> **Production-grade E2E UI & REST API Test Automation Framework built in TypeScript, Playwright, and Docker.**  
> Engineered by [Abhishek Raj P](https://github.com/abhi41289) (Senior SDET / Test Automation Architect).

---

## 🎯 Overview & Test Targets

This framework models production-grade test automation patterns for enterprise web applications and microservice backends:

| Layer | Target | Mechanism | Key Verification |
| :--- | :--- | :--- | :--- |
| **Web UI** | [SauceDemo](https://www.saucedemo.com) | Playwright Chromium/Firefox/WebKit | Login, Product Catalog, Cart, Dynamic E2E Checkout Flow |
| **REST API** | [Restful-Booker](https://restful-booker.herokuapp.com) | Playwright `APIRequestContext` | Token Auth, CRUD Booking Lifecycle, Payload Schema |
| **Hybrid E2E** | SauceDemo + Restful-Booker | Unified Fixture Pipeline | Interleaved UI state verification backed by API setups |
| **Performance** | SauceDemo Core Flows | Playwright + `web-vitals` injection | Core Web Vitals (LCP, FID, CLS) validation thresholds |

---

## 🏗️ Architecture & Design Patterns

```
PlaywrightE2E/
├── pages/          # Page Object Model (POM) — Encapsulates UI selectors & actions
├── helpers/        # API Client & Builder Pattern (BookingBuilder fluent payload generator)
├── fixtures/       # Composable Playwright fixtures (auth session, typed API client)
├── tests/
│   ├── e2e/        # Full end-to-end UI user journeys
│   ├── api/        # Standalone REST API regression & CRUD tests
│   └── visual/     # Pixel-perfect visual regression testing
├── data/           # TestDataFactory & strongly-typed test definitions
└── docs/           # Formal QA Documentation (TEST-PLAN.md, TEST-STRATEGY.md)
```

### Applied Software Design Patterns
- **Page Object Model (POM)**: Strict separation of locators and test assertions. All page actions return fluent page instances.
- **Builder Pattern (`BookingBuilder`)**: Fluent, readable construction of complex API request bodies with sensible defaults.
- **Factory Pattern (`TestDataFactory`)**: Strongly-typed synthetic data generator ensuring deterministic, reproducible test runs.
- **Custom Composable Fixtures**: Clean dependency injection for authenticated browser contexts and API clients without flaky `beforeEach` hooks.

---

## 🚀 Quick Start Guide

All framework code and configuration reside in the [`PlaywrightE2E/`](PlaywrightE2E/) directory.

### 1. Prerequisites
- **Node.js** >= 18.x
- **npm** >= 9.x
- **Docker** (optional, for containerized execution)

### 2. Installation & Setup

```bash
# Navigate to the framework directory
cd PlaywrightE2E

# Install dependencies and Playwright browser binaries
npm install
npx playwright install --with-deps

# Configure environment
cp .env.example .env
```

### 3. Execution Commands

```bash
# Run full regression suite (headless, parallel across all configured browsers)
npm test

# Run specific testing tiers
npm run test:e2e       # UI End-to-End flows
npm run test:api       # REST API test suite

# Run by smoke / regression tags
npm run test:smoke
npm run test:regression

# Interactive & Debugging modes
npm run test:ui        # Playwright modern UI runner
npm run test:headed    # Visible browser execution
npm run test:debug     # Step-by-step inspector debugging
```

### 4. Viewing Reports & Execution Traces

```bash
# Open interactive HTML test report
npm run test:report

# Inspect recorded execution trace (DOM snapshot, network, console logs)
npx playwright show-trace test-results/<trace-file>.zip
```

---

## 🐳 Docker Containerized Execution

Run the complete test suite in isolated, reproducible Docker containers:

```bash
cd PlaywrightE2E

# Build Docker image
docker build -t playwright-framework .

# Run tests and extract HTML reports to host
docker run --rm -v $(pwd)/playwright-report:/app/playwright-report playwright-framework
```

---

## 📋 Engineering Governance & Code Quality

- **TypeScript Strict Mode**: Zero `any` policy with strict compile-time checks (`npm run type-check`).
- **ESLint & Prettier**: Automated linting and formatting compliance (`npm run validate`).
- **Shift-Left Quality Gates**: Pre-commit hooks and GitHub Actions workflows executing across PR branches.

---

## 🔗 Author & Contact

**Abhishek Raj P**  
Senior SDET | Test Automation Architect | Quality Engineering  
- **GitHub**: [@abhi41289](https://github.com/abhi41289)  
- **LinkedIn**: [Abhishek Raj P](https://www.linkedin.com/in/abhishek-raj-p-96032959/)  
- **Framework Documentation**: See [`PlaywrightE2E/docs/`](PlaywrightE2E/docs/) for complete test plans and strategies.
