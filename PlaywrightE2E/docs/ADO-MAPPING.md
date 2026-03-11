# GitHub Actions → Azure DevOps Concept Mapping

**Version:** 1.0
**Date:** 2026-03-11

This document maps every GitHub Actions concept used in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)
to its Azure DevOps Pipelines equivalent. Use this as a translation guide when porting
the CI configuration to an enterprise ADO environment.

---

## 1. Top-Level Structure

| GitHub Actions | Azure DevOps | Notes |
|---|---|---|
| `.github/workflows/ci.yml` | `azure-pipelines.yml` (at repo root) | ADO looks for the pipeline YAML at a path you configure in the pipeline UI |
| `name:` (workflow name) | `name:` (pipeline name) | Both appear in the UI run list |
| `on:` (trigger block) | `trigger:` / `pr:` | ADO splits push and PR triggers into separate top-level keys |

---

## 2. Triggers

### GitHub Actions
```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
```

### Azure DevOps equivalent
```yaml
trigger:
  branches:
    include:
      - main

pr:
  branches:
    include:
      - main
```

**Key difference:** ADO `trigger` covers CI (push) events; `pr` covers pull request validation builds.
GitHub Actions uses a single `on:` block for both.

---

## 3. Concurrency / Cancel In-Progress

### GitHub Actions
```yaml
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
```

### Azure DevOps equivalent
```yaml
# In the pipeline UI: Edit → Triggers → check "Cancel running validation builds"
# Or via REST API / pipeline settings — there is no YAML key for this in ADO.
```

**Key difference:** ADO exposes concurrency cancellation via the pipeline UI settings or
the REST API, not as a YAML-level construct. GitHub Actions encodes it declaratively.

---

## 4. Jobs

| GitHub Actions | Azure DevOps | Notes |
|---|---|---|
| `jobs:` | `stages:` + `jobs:` | ADO adds an optional `stages` grouping layer above `jobs` |
| `job-id:` (key under `jobs:`) | `job: JobName` | ADO uses an explicit `job:` key; GHA uses the map key as the name |
| `runs-on: ubuntu-latest` | `pool: { vmImage: ubuntu-latest }` | Both reference the same Microsoft-hosted Ubuntu agent |
| `needs: [lint, type-check]` | `dependsOn: [Lint, TypeCheck]` | ADO uses `dependsOn` on the job or stage level |

### GitHub Actions
```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    needs: [lint, type-check]
```

### Azure DevOps equivalent
```yaml
jobs:
  - job: Test
    pool:
      vmImage: ubuntu-latest
    dependsOn:
      - Lint
      - TypeCheck
```

---

## 5. Steps

| GitHub Actions | Azure DevOps | Notes |
|---|---|---|
| `steps:` | `steps:` | Identical key name |
| `uses: actions/checkout@v4` | `- checkout: self` | ADO has a built-in `checkout` step type; no marketplace action needed |
| `uses: actions/setup-node@v4` | `- task: NodeTool@0` | ADO uses Tasks from the Marketplace or built-in task library |
| `run: npm ci` | `- script: npm ci` | ADO `script` runs a shell command (equivalent to GHA `run`) |
| `name:` on a step | `displayName:` | ADO uses `displayName` for step labels; GHA uses `name` |

### GitHub Actions
```yaml
- uses: actions/checkout@v4
- name: Set up Node.js
  uses: actions/setup-node@v4
  with:
    node-version: "20"
- name: Install dependencies
  run: npm ci
```

### Azure DevOps equivalent
```yaml
- checkout: self
- task: NodeTool@0
  displayName: Set up Node.js
  inputs:
    versionSpec: "20.x"
- script: npm ci
  displayName: Install dependencies
```

---

## 6. Environment Variables & Secrets

| GitHub Actions | Azure DevOps | Notes |
|---|---|---|
| `secrets.MY_SECRET` | `$(MY_SECRET)` | ADO uses `$(variable)` syntax, not `${{ secrets.x }}` |
| Repository secrets (Settings → Secrets) | Variable Groups (Library → Variable Groups) | ADO variable groups can be linked to Azure Key Vault for enterprise secret rotation |
| `env:` at job or step level | `variables:` at pipeline, stage, or job level | ADO `variables:` is more granular — pipeline → stage → job → step scope |

### GitHub Actions
```yaml
env:
  BASE_URL: ${{ secrets.BASE_URL }}
  SAUCE_USERNAME: ${{ secrets.SAUCE_USERNAME }}
```

### Azure DevOps equivalent
```yaml
variables:
  - group: playwright-secrets   # Variable Group containing BASE_URL, SAUCE_USERNAME, etc.
```
Then reference as `$(BASE_URL)` in scripts, or they are automatically available as environment
variables when `isSecret: false` (or when explicitly mapped).

---

## 7. Matrix Strategy

### GitHub Actions
```yaml
strategy:
  fail-fast: false
  matrix:
    project: [api, ui-chromium, ui-firefox, ui-webkit]
```

### Azure DevOps equivalent
```yaml
strategy:
  matrix:
    api:
      project: api
    chromium:
      project: ui-chromium
    firefox:
      project: ui-firefox
    webkit:
      project: ui-webkit
  maxParallel: 4
```
ADO matrix uses named keys (objects) rather than a list; `maxParallel` caps concurrent jobs.
`fail-fast: false` is the default in ADO — all matrix legs run regardless of sibling failures.

---

## 8. Artifact Upload

| GitHub Actions | Azure DevOps | Notes |
|---|---|---|
| `actions/upload-artifact@v4` | `PublishBuildArtifacts@1` or `PublishPipelineArtifact@1` | `PublishPipelineArtifact` is the modern replacement in ADO |
| `retention-days: 7` | `retentionLeaseUserId` or pipeline retention policy | ADO retention is set at the pipeline level (Project Settings → Pipelines → Retention) |
| `if: failure()` | `condition: failed()` | ADO uses `condition:` key with expression syntax |

### GitHub Actions
```yaml
- name: Upload test artifacts on failure
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: playwright-report-${{ matrix.project }}
    path: |
      playwright-report/
      test-results/
    retention-days: 7
```

### Azure DevOps equivalent
```yaml
- task: PublishPipelineArtifact@1
  displayName: Upload test artifacts on failure
  condition: failed()
  inputs:
    targetPath: $(System.DefaultWorkingDirectory)/playwright-report
    artifact: playwright-report-$(project)
    publishLocation: pipeline
```

---

## 9. Predefined Variables

| GitHub Actions | Azure DevOps | Meaning |
|---|---|---|
| `${{ github.ref }}` | `$(Build.SourceBranch)` | Current branch/ref |
| `${{ github.run_id }}` | `$(Build.BuildId)` | Unique run/build identifier |
| `${{ github.sha }}` | `$(Build.SourceVersion)` | Commit SHA |
| `${{ github.actor }}` | `$(Build.RequestedFor)` | User who triggered the run |
| `${{ github.repository }}` | `$(Build.Repository.Name)` | Repo name |

---

## 10. Complete ADO Translation

Below is the full `azure-pipelines.yml` equivalent of the CI workflow:

```yaml
# azure-pipelines.yml — ADO equivalent of .github/workflows/ci.yml

name: CI — Lint · Type-Check · Test

trigger:
  branches:
    include:
      - main

pr:
  branches:
    include:
      - main

variables:
  - group: playwright-secrets   # Contains: BASE_URL, API_BASE_URL, SAUCE_USERNAME, etc.

stages:
  - stage: Quality
    displayName: Lint and Type-Check
    jobs:
      - job: Lint
        displayName: ESLint
        pool:
          vmImage: ubuntu-latest
        steps:
          - checkout: self
          - task: NodeTool@0
            displayName: Set up Node.js 20
            inputs:
              versionSpec: "20.x"
          - script: npm ci
            displayName: Install dependencies
          - script: npm run lint
            displayName: Run ESLint

      - job: TypeCheck
        displayName: TypeScript
        pool:
          vmImage: ubuntu-latest
        steps:
          - checkout: self
          - task: NodeTool@0
            displayName: Set up Node.js 20
            inputs:
              versionSpec: "20.x"
          - script: npm ci
            displayName: Install dependencies
          - script: npm run type-check
            displayName: Run TypeScript type-check

  - stage: Test
    displayName: Playwright Tests
    dependsOn: Quality
    jobs:
      - job: PlaywrightTests
        displayName: Tests — $(project)
        pool:
          vmImage: ubuntu-latest
        strategy:
          matrix:
            api:
              project: api
              browser: chromium
            chromium:
              project: ui-chromium
              browser: chromium
            firefox:
              project: ui-firefox
              browser: firefox
            webkit:
              project: ui-webkit
              browser: webkit
          maxParallel: 4
        steps:
          - checkout: self
          - task: NodeTool@0
            displayName: Set up Node.js 20
            inputs:
              versionSpec: "20.x"
          - script: npm ci
            displayName: Install dependencies
          - script: npx playwright install --with-deps $(browser)
            displayName: Install Playwright browsers
          - script: npx playwright test --project=$(project)
            displayName: Run Playwright — $(project)
            env:
              CI: true
              BASE_URL: $(BASE_URL)
              API_BASE_URL: $(API_BASE_URL)
              SAUCE_USERNAME: $(SAUCE_USERNAME)
              SAUCE_PASSWORD: $(SAUCE_PASSWORD)
              BOOKER_USERNAME: $(BOOKER_USERNAME)
              BOOKER_PASSWORD: $(BOOKER_PASSWORD)
          - task: PublishPipelineArtifact@1
            displayName: Upload artifacts on failure
            condition: failed()
            inputs:
              targetPath: $(System.DefaultWorkingDirectory)/playwright-report
              artifact: playwright-report-$(project)-$(Build.BuildId)
              publishLocation: pipeline
```
