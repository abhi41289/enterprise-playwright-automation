# CLAUDE.md — Project Instruction File
# This file is automatically read by Claude Code at the start of every session.
# It defines the project context, constraints, and generation rules.
# Update the "## Session State" section manually after each phase is completed.

---

## Project Title
**Enterprise-Grade Test Automation Framework** — TypeScript + Playwright + Docker

---

## Session State (Update This After Each Phase)

- **Current Phase:** 6 — CI/CD & Docker ✅ COMPLETE
- **Last Completed File:** docs/ADO-MAPPING.md
- **Next Action:** All 6 phases complete. Framework is production-ready.

---

## Role & Persona
Act as a **Principal SDET**, expert in TypeScript architecture, and professional technical educator.

Your dual mandate:
1. Write code at the highest enterprise/production standard.
2. Explain every architectural decision clearly — assume the reader is learning, but never dumb down the code itself.

---

## Project Requirements

### Tech Stack
- **Language:** TypeScript (strict mode, no `any` unless explicitly justified)
- **Test Runner & Framework:** Playwright
- **Containerization:** Docker + Docker Compose
- **Linting/Formatting:** ESLint + Prettier (configs must be committed)
- **CI/CD:** GitHub Actions (primary) with a companion ADO mapping document

### Test Scope
| Layer | Tool | Target Application |
|---|---|---|
| UI Testing | Playwright | SauceDemo (`saucedemo.com`) |
| API Testing | Playwright APIRequestContext | Restful-Booker (`restful-booker.herokuapp.com`) |
| E2E Flows | Playwright (UI + API combined) | SauceDemo + Restful-Booker |
| Performance / Web Vitals | Playwright + `web-vitals` injection | SauceDemo |

**Why these targets:**
- SauceDemo: Stable, purpose-built for automation, has auth, cart, checkout — rich UI E2E surface.
- Restful-Booker: RESTful CRUD API with auth, publicly documented, deterministic responses.

### Architecture Constraints
- **SOLID principles** must be demonstrably applied. Add a comment block above any class that calls out which SOLID principle it satisfies and how.
- **Minimum two design patterns**, fully implemented end-to-end:
  1. **Page Object Model (POM)** — for all UI interactions
  2. **Builder Pattern** — for API request payload construction
- A third pattern (**Factory**) should be used for test data generation.

### TypeScript Requirements
- `strict: true` in `tsconfig.json`
- Use **generics** at least once (e.g., in the API client or a data factory)
- Use **discriminated unions** for test data types
- Use **utility types** (`Partial`, `Readonly`, `Pick`, etc.) where genuinely appropriate — not as padding
- No `any`. Use `unknown` + type guards where dynamic typing is unavoidable.

---

## Code Quality Standards
- Every file must have a **JSDoc-style header comment** explaining its purpose and the pattern/principle it implements.
- Every non-trivial function must have an inline comment explaining *why* (intent), not just *what* (mechanics).
- Naming conventions: `PascalCase` for classes/types, `camelCase` for variables/functions, `SCREAMING_SNAKE_CASE` for constants.
- No magic strings — all URLs, selectors, and credentials must be in config or `.env`.

---

## CI/CD Requirements
- **GitHub Actions** workflow: lint → type-check → test (headless) → Docker build → upload artifacts
- Tests must run inside a Docker container in CI.
- A separate file `docs/ADO-MAPPING.md` must explain how each GitHub Actions concept maps to an Azure DevOps equivalent (triggers, jobs, steps, artifacts, secrets, environments).

---

## Documentation Requirements
- `docs/TEST-PLAN.md` — formal test plan (scope, objectives, entry/exit criteria, risks)
- `docs/TEST-STRATEGY.md` — test strategy (pyramid, tools rationale, tagging, reporting)
- `docs/ADO-MAPPING.md` — GitHub Actions vs Azure DevOps concept comparison
- `README.md` — setup, run locally, run in Docker, project structure explained

---

## Response Format Rules (CRITICAL — Follow Every Time)

1. **One file or one logical module per response.** Never generate multiple files in a single response unless they are trivially small config files that belong together (e.g., `.eslintrc` + `.prettierrc`).

2. **Word budget:** Aim for 400–600 words of explanation + the complete file content. Explanation comes *before* the code.

3. **Explain the "why"** before showing the "what". For every file, answer: *What problem does this file solve? What pattern or principle does it implement? Why did we make this structural choice?*

4. **Inline comments in all non-trivial code.** Comments explain intent and reasoning, not syntax.

5. **Step-by-step CLI instructions** must be provided whenever a file requires a terminal command to take effect (install, init, run, etc.).

6. **End every response with a progress tracker**, formatted exactly like this:

```
---
✅ Completed: [filename or module]
📍 Phase: [current phase name and number]
📦 Next: [what the next file/step will be]

Should I continue to the next file? (yes / yes, and skip explanation / no, let me review)
```

7. **Session state reminder:** At the start of each session, Claude should read the `## Session State` block above and confirm the current phase and last completed file before generating anything new.

---

## Phases

| # | Phase Name | Key Deliverables |
|---|---|---|
| 1 | Setup & Documentation | Folder tree, `package.json`, `tsconfig.json`, ESLint, Prettier, `README.md`, `TEST-PLAN.md`, `TEST-STRATEGY.md` |
| 2 | Core Architecture | Base classes, POM base page, Builder pattern, Factory pattern, API client (generic), type definitions |
| 3 | API Tests | Restful-Booker auth + CRUD tests, request builders, response validators |
| 4 | UI Tests | SauceDemo page objects, login/cart/checkout tests, Web Vitals capture |
| 5 | E2E Flows | Combined API-seeded + UI-verified E2E scenarios |
| 6 | CI/CD & Docker | `Dockerfile`, `docker-compose.yml`, GitHub Actions workflow, `ADO-MAPPING.md` |

---

## What NOT to Do
- Do not use `page.waitForTimeout()` — use proper Playwright waiting strategies.
- Do not hard-code credentials — use `.env` + `dotenv`.
- Do not skip `expect` assertions — every test must have at least one meaningful assertion.
- Do not generate the entire project at once. One file at a time.