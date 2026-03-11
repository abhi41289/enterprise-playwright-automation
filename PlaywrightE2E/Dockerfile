# ─────────────────────────────────────────────────────────────────────────────
# Dockerfile
# Purpose:  Hermetic Playwright test execution environment.
#           Uses the official Microsoft Playwright base image so all browser
#           binaries and system libraries are pre-installed — no slow
#           `npx playwright install` step needed inside the container.
#
# Pattern:  Immutable Infrastructure — every build produces an identical
#           environment, eliminating "works on my machine" failures.
#
# Usage:
#   Build:  docker build -t playwright-tests .
#   Run:    docker run --rm -e BASE_URL=... -e API_BASE_URL=... playwright-tests
# ─────────────────────────────────────────────────────────────────────────────

# Pin to a specific Playwright version to match the package.json dependency.
# Playwright bundles Chromium, Firefox, and WebKit inside this image.
# Using the -noble (Ubuntu 24.04) variant for up-to-date system libs.
FROM mcr.microsoft.com/playwright:v1.44.0-noble

# ── Metadata ───────────────────────────────────────────────────────────────────
LABEL maintainer="SDET Team"
LABEL description="Enterprise Playwright automation — TypeScript + API + UI + E2E"

# ── Working directory ──────────────────────────────────────────────────────────
# /app is the conventional app root inside Docker containers.
WORKDIR /app

# ── Environment ────────────────────────────────────────────────────────────────
# NODE_ENV=test signals to any env-aware code (and npm lifecycle scripts) that
# this is a test execution context — not development or production.
ENV NODE_ENV=test

# CI=true tells Playwright to:
#   - use retries: 1 (as configured in playwright.config.ts)
#   - use the list + html reporters
#   - forbid .only tests
ENV CI=true

# ── Install dependencies ────────────────────────────────────────────────────────
# Layer 1: Copy lockfile first — Docker re-uses this layer if package*.json
# hasn't changed, saving significant build time on code-only changes.
COPY package*.json ./

# npm ci is preferred over npm install in CI/Docker:
#   - Installs exactly what is in package-lock.json (deterministic)
#   - Fails if package-lock.json is out of sync (surfacing drift early)
RUN npm ci

# ── Copy source ─────────────────────────────────────────────────────────────────
# Layer 2: Copy everything else. .dockerignore excludes node_modules,
# playwright-report, and test-results to keep the build context small.
COPY . .

# ── Artifacts directory ─────────────────────────────────────────────────────────
# Pre-create the output directories so they are owned by the container user,
# avoiding permission errors when Playwright writes test artifacts.
RUN mkdir -p playwright-report test-results

# ── Default command ─────────────────────────────────────────────────────────────
# Running all tests by default. Override at runtime with:
#   docker run ... playwright-tests npx playwright test tests/api/
# or via the docker-compose 'command' key.
CMD ["npx", "playwright", "test"]
