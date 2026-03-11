# Expo FastAPI Convex Monorepo

## TL;DR

> Build a greenfield monorepo around `apps/mobile` (Expo), `apps/api` (FastAPI), `apps/convex` (Convex), and `apps/scraper` (Python ingestion), orchestrated with `pnpm` workspaces + `turbo` and backed by a clear ownership split: Convex for realtime collaborative state, FastAPI for heavy business logic/integrations, scraper for data ingestion.
>
> **Deliverables**:
>
> - Production-oriented monorepo scaffold and workspace tooling
> - Rough/mocked service shells for Expo, FastAPI, Convex, and scraper
> - Clerk auth and PostHog analytics integration points across mobile and backend surfaces
> - One-command local dev workflow
> - Shared config/contracts packages
> - Short architecture/setup docs
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 5 waves
> **Critical Path**: Foundation -> shared packages -> service scaffolds -> mobile wiring -> docs/tooling -> integration verification

---

## Context

### Original Request

Formalize the recommended Expo + FastAPI + Convex monorepo into a practical rough setup, add a scraper app for filling data, make local development easy, keep the structure production-ready, document it briefly, and validate the setup against current best practices so implementation can begin quickly.

### Interview Summary

**Key Discussions**:

- The repository is greenfield; there is no existing structure to preserve.
- Expo is the only UI surface; no web UI or shared UI package is needed.
- FastAPI and Convex should coexist with clear boundaries instead of competing for the same concerns.
- A separate scraper app should exist for ingestion/backfill work.
- The setup should be rough/mock-friendly, not a full product implementation.

**Research Findings**:

- Expo SDK 52+ has first-class monorepo support with workspaces and modern package managers.
- Convex integrates cleanly with Expo and can also be accessed from Python/HTTP when needed.
- FastAPI is a strong fit for standalone API/business logic and integration-heavy work.
- A hybrid split is the strongest maintainable architecture for this product shape.

### Metis Review

**Identified Gaps** (addressed):

- Auth provider choice was unspecified -> defaulted to a single external-JWT-compatible auth boundary, deferred as pluggable in setup.
- FastAPI persistence strategy was unspecified -> defaulted to lightweight relational persistence scaffolding suitable for later Postgres promotion.
- Scope could inflate into real app development -> constrained with explicit guardrails and example-only service shells.
- One-command local dev needed explicit definition -> standardized around a root `turbo dev` workflow.

---

## Work Objectives

### Core Objective

Design a single executable work plan for a smart monorepo scaffold that lets the team start real feature work quickly without revisiting foundational architecture decisions.

### Concrete Deliverables

- Root monorepo workspace using `pnpm` + `turbo`
- `apps/mobile` Expo app scaffold with FastAPI + Convex + Clerk + PostHog connectivity points
- `apps/api` FastAPI scaffold with health and example routes
- `apps/api` FastAPI auth/analytics boundary for Clerk JWT validation and PostHog events
- `apps/convex` Convex scaffold with example schema/query/mutation
- `apps/scraper` Python scaffold with example ingestion/mock output flow
- `packages/contracts` and `packages/config` shared packages
- Root dev commands, env examples, and short architecture/setup docs

### Definition of Done

- [x] Root workspace installs successfully using the planned package manager/tooling.
- [x] A single root dev command is defined that starts all required local services.
- [x] Each app has a minimal executable shell and health-checkable path.
- [x] Service boundaries are documented clearly enough that new work can be placed in the right app without ambiguity.
- [x] The scaffold includes enough mocks/examples for immediate follow-up implementation.

### Must Have

- Clear data/service ownership boundaries between FastAPI and Convex
- Separate scraper app for ingestion/backfill work
- Rough production-minded structure without overbuilding
- Short docs for setup, architecture, and local workflow
- Clerk auth boundary and PostHog analytics wiring defined at scaffold level
- Validation against current docs/examples

### Must NOT Have (Guardrails)

- No real product feature implementation (meal planning, shopping, chat UX)
- No real scraper/site-specific logic or crawling stack
- No full authentication product flows or production analytics taxonomy during scaffold phase
- No full production infra rollout (Terraform, cloud provisioning, full CI/CD)
- No shared UI package or extra UI surface beyond Expo mobile
- No duplicate ownership of the same domain entity across FastAPI and Convex
- No vague service boundaries; every new concern must map to one owner

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision

- **Infrastructure exists**: NO
- **Automated tests**: YES (Tests-after)
- **Framework**: Expo/Jest + `@testing-library/react-native` for mobile smoke tests, optional Expo web + Playwright for scripted UI assertions, Python `pytest`, and service-level smoke/integration checks
- **Rationale**: This is a greenfield scaffold; establish test infrastructure and smoke coverage after each shell is created, with mobile verification forced through reproducible commands instead of manual device checks.

### QA Policy

Every task includes agent-executed QA scenarios with concrete commands, endpoints, selectors, or expected outputs. Evidence paths should be saved under `.sisyphus/evidence/` during execution.

- **Frontend/UI**: Prefer Jest + `@testing-library/react-native` for structural smoke tests and Expo web + Playwright for scripted UI assertions with explicit commands
- **API/Backend**: `curl`/HTTP validation for FastAPI and Convex-exposed flows
- **CLI/Worker**: direct command execution for scraper and workspace tooling
- **Config/Repo**: typecheck, lint, install, and orchestration command verification

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (Start Immediately — foundation):

- Task 1: Lock architecture defaults and guardrails
- Task 2: Create root monorepo workspace and orchestration config
- Task 3: Create shared config package
- Task 4: Create shared contracts package
- Task 5: Define env strategy and example env files plan

Wave 2 (After Wave 1 — service scaffolds):

- Task 6: Scaffold `apps/api`
- Task 7: Scaffold `apps/convex`
- Task 8: Scaffold `apps/scraper`
- Task 9: Scaffold `apps/mobile`
- Task 10: Define shared local networking conventions

Wave 3 (After Wave 2 — glue and examples):

- Task 11: Wire mobile -> FastAPI example path
- Task 12: Wire mobile -> Convex example path
- Task 13: Define FastAPI <-> Convex interaction pattern
- Task 14: Define scraper ingestion pattern and mock pipeline
- Task 15: Add root one-command dev workflow

Wave 4 (After Wave 3 — docs, auth, analytics, and quality):

- Task 16: Write architecture and setup docs
- Task 17: Add lint/typecheck/test tooling plan
- Task 18: Add pre-commit / repo hygiene plan
- Task 19: Add production-readiness glue plan
- Task 23: Define shared Clerk/PostHog env contract and configuration strategy
- Task 24: Add Clerk integration plan for mobile and FastAPI auth boundary
- Task 25: Add PostHog integration plan for mobile and FastAPI analytics boundary

Wave 5 (After Wave 4 — verification and polish):

- Task 20: End-to-end local workflow verification
- Task 21: Scope fidelity and boundary audit
- Task 22: Docs accuracy verification against current standards

### Dependency Matrix

- **1**: — -> 2, 6-25
- **2**: 1 -> 6-10, 15-20, 23-25
- **3**: 1 -> 6-19, 23-25
- **4**: 1 -> 9, 11-14, 16-20, 23-25
- **5**: 1 -> 6-20, 23-25
- **6**: 2,3,5 -> 11,13,17,19,20
- **7**: 2,3,4,5 -> 12,13,17,19,20
- **8**: 2,3,5 -> 14,17,19,20
- **9**: 2,3,4,5 -> 11,12,17,20
- **10**: 2,5 -> 11-15,20
- **11**: 6,9,10 -> 20
- **12**: 7,9,10 -> 20
- **13**: 6,7 -> 19,20,21
- **14**: 6,7,8 -> 19,20,21
- **15**: 2,6-10 -> 20
- **16**: 6-15 -> 22
- **17**: 6-15 -> 20
- **18**: 2,3,6-9 -> 20
- **19**: 6-8,13,14 -> 21,22
- **20**: 11,12,15,17,18 -> 21,22
- **21**: 13,14,19,20 -> 22
- **22**: 16,19,20,21 -> —
- **23**: 2,3,4,5,9,10 -> 24,25
- **24**: 6,9,10,23 -> 20,21,22
- **25**: 6,9,10,23 -> 20,21,22

### Agent Dispatch Summary

- **Wave 1**: 5 tasks — `quick` / `unspecified-low`
- **Wave 2**: 5 tasks — `unspecified-low` / `unspecified-high`
- **Wave 3**: 5 tasks — `deep` / `unspecified-high`
- **Wave 4**: 7 tasks — `writing` / `code-quality` / `unspecified-low` / `deep`
- **Wave 5**: 3 tasks — `deep` / `oracle` / `unspecified-high`

---

## TODOs

- [x] 1. Lock architecture defaults and guardrails

  **What to do**:
  - Record the final architectural defaults: `pnpm` + `turbo`, Expo-only UI, hybrid FastAPI/Convex split, separate scraper app, `uv` for Python apps.
  - Add explicit guardrails for what this scaffold must not implement.
  - Freeze default assumptions for auth, persistence, and local dev semantics.

  **Must NOT do**:
  - Do not start implementing product features.
  - Do not choose two owners for the same domain entity.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: decision capture and scope-locking are low-code but high-leverage.
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `docs-write`: useful later, but this task is architecture locking, not documentation polish.

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1
  - **Blocks**: 2, 6-22
  - **Blocked By**: None

  **References**:
  - `README.md:1` - Only existing project context; use product description to keep the scaffold aligned to the app idea.
  - `https://docs.expo.dev/guides/monorepos/` - Confirms Expo monorepo support and package-manager guidance.
  - `.sisyphus/drafts/expo-fastapi-convex-monorepo.md:1` - Current captured decisions and research notes.

  **Acceptance Criteria**:
  - [ ] Architecture defaults are written into repo docs/config plan.
  - [ ] Guardrails explicitly prohibit auth/product/scraper overbuild.

  **QA Scenarios**:

  ```
  Scenario: Architecture defaults are explicit
    Tool: Bash (grep)
    Preconditions: Docs/plan files updated
    Steps:
      1. Search for `pnpm`, `turbo`, `apps/mobile`, `apps/api`, `apps/convex`, and `apps/scraper` in the architecture docs.
      2. Search for guardrail phrases such as `Must NOT` and `no real product feature implementation`.
      3. Verify each appears exactly where architectural guidance is documented.
    Expected Result: Defaults and guardrails are present and readable.
    Failure Indicators: Missing service owner, missing guardrail section, or conflicting defaults.
    Evidence: .sisyphus/evidence/task-1-architecture-defaults.txt

  Scenario: Ownership split is non-overlapping
    Tool: Bash (grep)
    Preconditions: Architecture docs updated
    Steps:
      1. Search docs for `Convex owns` and `FastAPI owns` sections.
      2. Compare listed responsibilities.
      3. Confirm no identical domain entity is listed under both owners.
    Expected Result: Ownership split is unique and unambiguous.
    Failure Indicators: Duplicate ownership or no explicit split.
    Evidence: .sisyphus/evidence/task-1-ownership-audit.txt
  ```

  **Commit**: YES
  - Message: `docs(architecture): lock scaffold defaults and boundaries`
  - Files: `.sisyphus/plans/expo-fastapi-convex-monorepo.md`, architecture docs
  - Pre-commit: `grep -n "Must NOT" .sisyphus/plans/expo-fastapi-convex-monorepo.md`

- [x] 2. Create root monorepo workspace and orchestration config

  **What to do**:
  - Scaffold root `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.nvmrc`, and root scripts.
  - Define `dev`, `lint`, `typecheck`, and `test` orchestration from the root.
  - Keep the workspace ready for mixed Node + Python apps.

  **Must NOT do**:
  - Do not add web UI packages.
  - Do not add production deployment automation yet.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: foundational repo config across a few files.
  - **Skills**: [`code-quality`]
    - `code-quality`: useful for validating config and workspace scripts after creation.
  - **Skills Evaluated but Omitted**:
    - `use-graphite`: unrelated to repo scaffold itself.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with 3, 4, 5 after task 1 defaults are fixed)
  - **Blocks**: 6-10, 15-20
  - **Blocked By**: 1

  **References**:
  - `https://docs.expo.dev/guides/monorepos/` - Root workspace structure and Expo expectations.
  - `https://github.com/get-convex/turbo-expo-nextjs-clerk-convex-monorepo` - Real-world `apps/*` plus shared backend package shape using turbo.

  **Acceptance Criteria**:
  - [ ] Root workspace config files exist and reference the intended app/package layout.
  - [ ] Root scripts exist for `dev`, `lint`, `typecheck`, and `test`.

  **QA Scenarios**:

  ```
  Scenario: Workspace installs from root
    Tool: Bash
    Preconditions: Root config files created
    Steps:
      1. Run `pnpm install` from repo root.
      2. Confirm lockfile generation/update succeeds without workspace resolution errors.
      3. Run `pnpm turbo run lint --dry=json` or equivalent pipeline inspection.
    Expected Result: Root workspace resolves and turbo sees configured tasks.
    Failure Indicators: Missing workspaces, invalid turbo pipeline, install resolution failure.
    Evidence: .sisyphus/evidence/task-2-root-workspace.txt

  Scenario: Root commands expose all services
    Tool: Bash
    Preconditions: Scripts defined in root `package.json`
    Steps:
      1. Read root scripts using `node -p "require('./package.json').scripts"`.
      2. Verify presence of `dev`, `lint`, `typecheck`, and `test`.
      3. Verify `dev` fans out to mobile/api/convex/scraper or their task aliases.
    Expected Result: A single command exists for local orchestration.
    Failure Indicators: Missing scripts or scripts that omit one of the required apps.
    Evidence: .sisyphus/evidence/task-2-root-scripts.txt
  ```

  **Commit**: YES
  - Message: `build(repo): add workspace and turbo foundation`
  - Files: root config files
  - Pre-commit: `pnpm install && pnpm lint`

- [x] 3. Create shared config package

  **What to do**:
  - Add `packages/config` for shared TypeScript config, ESLint config, Prettier config, and optional env/schema helpers.
  - Keep the package focused on repo-wide defaults rather than business logic.

  **Must NOT do**:
  - Do not add UI utilities.
  - Do not put app-specific settings into shared config.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: small shared package with limited scope.
  - **Skills**: [`code-quality`]
    - `code-quality`: validates config reuse and lint consistency.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 6-19
  - **Blocked By**: 1

  **References**:
  - `https://docs.expo.dev/guides/monorepos/` - Shared packages are the standard monorepo pattern Expo expects.
  - `https://github.com/get-convex/turbo-expo-nextjs-clerk-convex-monorepo` - Example of centralized repo tooling.

  **Acceptance Criteria**:
  - [ ] Shared config package can be imported by multiple Node/TS workspaces.
  - [ ] Lint/typecheck configs are centralized and documented.

  **QA Scenarios**:

  ```
  Scenario: Shared config is consumable
    Tool: Bash
    Preconditions: `packages/config` exists
    Steps:
      1. Run workspace typecheck/lint using one consumer app and one shared package.
      2. Verify config resolution does not depend on relative path hacks.
      3. Confirm package exports are valid.
    Expected Result: Consumer workspaces resolve shared config cleanly.
    Failure Indicators: Broken config import, unresolved path, or duplicated config files in apps.
    Evidence: .sisyphus/evidence/task-3-shared-config.txt
  ```

  **Commit**: YES
  - Message: `build(config): add shared repo configuration package`
  - Files: `packages/config/*`
  - Pre-commit: `pnpm typecheck`

- [x] 4. Create shared contracts package

  **What to do**:
  - Add `packages/contracts` for shared domain types, OpenAPI-generated TS types, and cross-service request/response contracts.
  - Define boundaries so FastAPI and Expo share contracts without creating shared UI or business logic packages.

  **Must NOT do**:
  - Do not mirror Convex internal generated code into FastAPI blindly.
  - Do not place runtime business logic in the contracts package.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: focused package creation with a schema/codegen boundary.
  - **Skills**: [`code-quality`]
    - `code-quality`: helps ensure generated and authored types coexist cleanly.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 9, 11-14, 16-20
  - **Blocked By**: 1

  **References**:
  - `https://fastapi.tiangolo.com/` - FastAPI/OpenAPI contract generation basis.
  - `https://stack.convex.dev/tables-convex-modules-rest-apis` - Example of shared API contracts and typed backend access.

  **Acceptance Criteria**:
  - [ ] Shared contracts package clearly separates authored types from generated artifacts.
  - [ ] Mobile/FastAPI integration can target a stable contract layer.

  **QA Scenarios**:

  ```
  Scenario: Contracts package supports generated and manual types
    Tool: Bash
    Preconditions: `packages/contracts` exists
    Steps:
      1. Run the codegen/smoke command for contract generation if configured.
      2. Import the package from a sample consumer file in mobile or api.
      3. Run typecheck to confirm generated types are valid.
    Expected Result: Consumers can use contracts without copy-pasting local types.
    Failure Indicators: Broken imports, generator output in wrong location, or circular dependencies.
    Evidence: .sisyphus/evidence/task-4-contracts.txt
  ```

  **Commit**: YES
  - Message: `build(contracts): add shared type and contract package`
  - Files: `packages/contracts/*`
  - Pre-commit: `pnpm typecheck`

- [x] 5. Define env strategy and example env files plan

  **What to do**:
  - Standardize env file naming and ownership for root, mobile, api, convex, and scraper.
  - Separate public mobile envs from server-only envs.
  - Document local defaults, ports, and secret placeholders.

  **Must NOT do**:
  - Do not commit real secrets.
  - Do not rely on a single env file for all services in production; use the root `.env` only for local dev and keep per-app `.env.example` files.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: this is a constrained configuration/documentation task.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 6-20
  - **Blocked By**: 1

  **References**:
  - `https://docs.expo.dev/guides/using-convex/` - `EXPO_PUBLIC_CONVEX_URL` pattern and mobile env exposure.
  - `https://fastapi.tiangolo.com/advanced/settings/` - Server env handling concepts.

  **Acceptance Criteria**:
  - [ ] `.env.example` coverage is defined for each service.
  - [ ] Port/env ownership is documented and non-conflicting.

  **QA Scenarios**:

  ```
  Scenario: Env examples cover all required services
    Tool: Bash (grep)
    Preconditions: Env examples created
    Steps:
      1. Search for `.env.example` files in root and each app.
      2. Verify variables for FastAPI base URL, Convex URL, and scraper config are documented.
      3. Verify no real secret values appear.
    Expected Result: Each service has a clear env contract and placeholders only.
    Failure Indicators: Missing env examples, leaked secrets, or shared server/mobile secret misuse.
    Evidence: .sisyphus/evidence/task-5-env-strategy.txt
  ```

  **Commit**: YES
  - Message: `docs(env): define multi-service environment strategy`
  - Files: env example files, docs
  - Pre-commit: `grep -R "sk_live\|secret_" . -n || true`

- [x] 6. Scaffold `apps/api`

  **What to do**:
  - Create FastAPI app structure using `uv`, `pyproject.toml`, app package layout, and a `/health` endpoint.
  - Add one example route that returns mocked domain data suitable for mobile integration.
  - Keep persistence lightweight and upgradeable, favoring simple relational scaffolding over full domain modeling.

  **Must NOT do**:
  - Do not build real domain CRUD.
  - Do not add production deployment provider configs yet.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: focused backend scaffold across a few Python files.
  - **Skills**: [`code-quality`]
    - `code-quality`: ensures ruff/typecheck/pytest basics are wired immediately.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 11, 13, 17, 19, 20
  - **Blocked By**: 2, 3, 5

  **References**:
  - `https://fastapi.tiangolo.com/tutorial/bigger-applications/` - Canonical multi-file FastAPI organization.
  - `https://fastapi.tiangolo.com/tutorial/cors/` - Required CORS setup for mobile/web client interactions.

  **Acceptance Criteria**:
  - [ ] `apps/api` has `pyproject.toml`, app module, and `/health` route.
  - [ ] Local dev command starts the app successfully.

  **QA Scenarios**:

  ```
  Scenario: FastAPI health endpoint works
    Tool: Bash (curl)
    Preconditions: API dev server running locally on planned port
    Steps:
      1. Start API using the documented local command.
      2. Run `curl http://127.0.0.1:8000/health`.
      3. Assert HTTP 200 and response body contains a predictable key such as `status` or `ok`.
    Expected Result: API responds successfully and is reachable from local tooling.
    Failure Indicators: Import errors, server boot failure, 404, or malformed response.
    Evidence: .sisyphus/evidence/task-6-api-health.txt

  Scenario: Example route returns mock payload
    Tool: Bash (curl)
    Preconditions: API dev server running
    Steps:
      1. Call the documented example route.
      2. Parse JSON and verify expected mock fields exist.
      3. Confirm CORS middleware is configured in app startup.
    Expected Result: Example payload is returned and route is usable for mobile wiring.
    Failure Indicators: Missing route, invalid JSON, or no CORS setup.
    Evidence: .sisyphus/evidence/task-6-api-example.txt
  ```

  **Commit**: YES
  - Message: `build(api): scaffold fastapi service shell`
  - Files: `apps/api/*`
  - Pre-commit: `uv run pytest && uv run ruff check .`

- [x] 7. Scaffold `apps/convex`

  **What to do**:
  - Create Convex project layout, schema, one example query, and one example mutation.
  - Keep the example focused on realtime/mobile proof, not domain completeness.
  - Establish env and generation workflow for Convex artifacts.

  **Must NOT do**:
  - Do not model the full household/product domain.
  - Do not duplicate FastAPI-owned entities inside Convex.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: straightforward service scaffold with generated artifacts.
  - **Skills**: [`code-quality`]
    - `code-quality`: validates generation, linting, and workspace integration.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 12, 13, 17, 19, 20
  - **Blocked By**: 2, 3, 4, 5

  **References**:
  - `https://docs.expo.dev/guides/using-convex/` - Expo-side setup expectations for Convex.
  - `https://docs.convex.dev/quickstart/react-native` - Minimal query/mutation/client loop.

  **Acceptance Criteria**:
  - [ ] Convex dev command and schema/function files are present.
  - [ ] Example query/mutation can be consumed by mobile.

  **QA Scenarios**:

  ```
  Scenario: Convex dev boots and generates artifacts
    Tool: Bash
    Preconditions: Convex project scaffolded and env configured
    Steps:
      1. Run the documented Convex dev command.
      2. Confirm generated files appear/update.
      3. Verify no schema/function boot errors are emitted.
    Expected Result: Convex dev stays running and artifacts are available.
    Failure Indicators: Missing env, generation failure, invalid schema, or boot crash.
    Evidence: .sisyphus/evidence/task-7-convex-dev.txt

  Scenario: Example query/mutation round-trip works
    Tool: Bash
    Preconditions: Convex dev running
    Steps:
      1. Execute a mutation through the documented mechanism.
      2. Read the example query result.
      3. Confirm the updated value appears as expected.
    Expected Result: Example realtime data path works end-to-end.
    Failure Indicators: Mutation not found, query returns unchanged data, or generation mismatch.
    Evidence: .sisyphus/evidence/task-7-convex-roundtrip.txt
  ```

  **Commit**: YES
  - Message: `build(convex): scaffold realtime backend shell`
  - Files: `apps/convex/*`
  - Pre-commit: `pnpm typecheck`

- [x] 8. Scaffold `apps/scraper`

  **What to do**:
  - Create a Python app using `uv` with a CLI entrypoint and mock ingestion flow.
  - Structure it so future site-specific scraping or import jobs can plug in without reshaping the repo.
  - Produce either stdout/file/mock API output as the initial proof path.

  **Must NOT do**:
  - Do not implement real site scraping.
  - Do not add queue systems, proxies, or scheduling infrastructure.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: minimal Python worker scaffold.
  - **Skills**: [`code-quality`]
    - `code-quality`: validates Python toolchain and CLI wiring.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 14, 17, 19, 20
  - **Blocked By**: 2, 3, 5

  **References**:
  - `https://docs.convex.dev/http-api` - Options if scraper later needs to write to Convex.
  - `https://github.com/get-convex/convex-py` - Python client direction if a richer Convex integration is added later.

  **Acceptance Criteria**:
  - [ ] Scraper app has its own `pyproject.toml` and runnable CLI/module.
  - [ ] Running it produces deterministic mock output.

  **QA Scenarios**:

  ```
  Scenario: Scraper CLI runs successfully
    Tool: Bash
    Preconditions: `apps/scraper` scaffolded
    Steps:
      1. Run the documented scraper command.
      2. Capture stdout or output artifact.
      3. Verify mock records are emitted in the documented shape.
    Expected Result: Scraper shell runs without network dependencies.
    Failure Indicators: Import error, missing entrypoint, or non-deterministic output.
    Evidence: .sisyphus/evidence/task-8-scraper-cli.txt

  Scenario: Scraper output is integration-ready
    Tool: Bash
    Preconditions: Scraper CLI runs
    Steps:
      1. Validate emitted JSON/record shape against the documented contract.
      2. Confirm the output can be consumed by a mock pipeline path (file or HTTP payload).
    Expected Result: Output is structured for future ingestion without extra reshaping.
    Failure Indicators: Missing required fields or ad-hoc format.
    Evidence: .sisyphus/evidence/task-8-scraper-contract.txt
  ```

  **Commit**: YES
  - Message: `build(scraper): scaffold ingestion worker shell`
  - Files: `apps/scraper/*`
  - Pre-commit: `uv run pytest && uv run ruff check .`

- [x] 9. Scaffold `apps/mobile`

  **What to do**:
  - Create Expo app scaffold for iOS-first mobile development.
  - Add a minimal navigation/app shell and connectivity points for FastAPI and Convex.
  - Keep the app compatible with the chosen monorepo/workspace approach.

  **Must NOT do**:
  - Do not build real meal-planning UI.
  - Do not introduce a shared UI package.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Expo scaffold + monorepo wiring + iOS considerations are slightly more sensitive.
  - **Skills**: [`code-quality`]
    - `code-quality`: validates TS/linting after Expo creation.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 11, 12, 17, 20
  - **Blocked By**: 2, 3, 4, 5

  **References**:
  - `https://docs.expo.dev/guides/monorepos/` - Required monorepo assumptions.
  - `https://docs.expo.dev/guides/using-convex/` - Convex wiring pattern from Expo.

  **Acceptance Criteria**:
  - [ ] Expo app boots in the monorepo.
  - [ ] Mobile app contains placeholders for API and Convex integration.

  **QA Scenarios**:

  ```
  Scenario: Expo app boots in monorepo and passes smoke test
    Tool: Bash
    Preconditions: `apps/mobile` scaffolded and dependencies installed
    Steps:
      1. Run `pnpm --filter mobile test -- --runInBand` with a smoke test that renders the root app component using `@testing-library/react-native`.
      2. Assert the test output contains `PASS` and the root shell text identifier.
      3. Run `pnpm --filter mobile exec expo export --platform web` or equivalent no-device compile check.
    Expected Result: Mobile shell compiles and root component renders in an automated test path.
    Failure Indicators: Jest render failure, Expo compile failure, or monorepo resolution errors.
    Evidence: .sisyphus/evidence/task-9-expo-start.txt

  Scenario: iOS-friendly local configuration is documented
    Tool: Bash (grep)
    Preconditions: Mobile docs/config updated
    Steps:
      1. Search docs for simulator/device networking notes and required envs.
      2. Confirm FastAPI base URL handling is documented for local mobile use.
    Expected Result: Local mobile networking is not left ambiguous.
    Failure Indicators: Missing localhost/device guidance.
    Evidence: .sisyphus/evidence/task-9-mobile-networking.txt
  ```

  **Commit**: YES
  - Message: `build(mobile): scaffold expo app shell`
  - Files: `apps/mobile/*`
  - Pre-commit: `pnpm typecheck`

- [x] 10. Define shared local networking conventions

  **What to do**:
  - Standardize local ports, service hostnames, and mobile-safe base URL conventions.
  - Document simulator vs device differences and any root env indirection.
  - Ensure all services use predictable local addresses.

  **Must NOT do**:
  - Do not hardcode machine-specific IPs into source.
  - Do not leave port selection implicit.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: a narrow but important integration decision.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 11-15, 20
  - **Blocked By**: 2, 5

  **References**:
  - `https://fastapi.tiangolo.com/tutorial/cors/` - Local origin rules and explicit origins.
  - `https://docs.expo.dev/guides/monorepos/` - Local workspace/dev assumptions.

  **Acceptance Criteria**:
  - [ ] Port map and local URL strategy are documented.
  - [ ] Mobile-safe API URL handling is defined.

  **QA Scenarios**:

  ```
  Scenario: Port map is conflict-aware and explicit
    Tool: Bash (grep)
    Preconditions: Docs/config updated
    Steps:
      1. Search docs and env examples for API, Convex, and mobile local values.
      2. Confirm each service has one documented local port or address strategy.
    Expected Result: A developer can tell exactly where each service runs.
    Failure Indicators: Missing port values or conflicting conventions.
    Evidence: .sisyphus/evidence/task-10-port-map.txt
  ```

  **Commit**: YES
  - Message: `docs(dev): define local service networking conventions`
  - Files: docs, env examples
  - Pre-commit: `grep -R "localhost\|127.0.0.1" docs apps -n`

- [x] 11. Wire mobile -> FastAPI example path

  **What to do**:
  - Add a typed/example API client path from Expo to FastAPI.
  - Display one mocked API response in the Expo shell.
  - Keep the wiring reusable for future feature work.

  **Must NOT do**:
  - Do not build a full data layer.
  - Do not inline base URLs throughout screens/components.

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: this touches service glue and app structure.
  - **Skills**: [`code-quality`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: 20
  - **Blocked By**: 6, 9, 10

  **References**:
  - `https://fastapi.tiangolo.com/` - Response and request modeling conventions.
  - `packages/contracts` - Shared place for client-visible API contracts.

  **Acceptance Criteria**:
  - [ ] Mobile app can call the FastAPI example route.
  - [ ] Response is rendered in a simple app shell view.

  **QA Scenarios**:

  ```
  Scenario: Mobile fetches FastAPI mock successfully
    Tool: Bash
    Preconditions: API running locally and mobile test harness configured
    Steps:
      1. Start FastAPI on the documented local port.
      2. Run `pnpm --filter mobile test -- --runInBand api.integration.test.tsx` where the test renders the screen and mocks only platform wrappers, not the HTTP response.
      3. Assert the test output contains the mock payload text returned from the live local FastAPI example route.
    Expected Result: Mobile-to-API integration works through the shared config/client path in an automated test.
    Failure Indicators: Wrong base URL, failed fetch, or no rendered API text.
    Evidence: .sisyphus/evidence/task-11-mobile-api.txt

  Scenario: API URL is centrally configured
    Tool: Bash (grep)
    Preconditions: Mobile code updated
    Steps:
      1. Search for hardcoded API URLs in `apps/mobile`.
      2. Confirm usage flows through a config/client wrapper.
    Expected Result: No duplicated hardcoded URLs in screen components.
    Failure Indicators: Multiple inline base URLs or screen-specific fetch logic.
    Evidence: .sisyphus/evidence/task-11-api-config-audit.txt
  ```

  **Commit**: YES
  - Message: `feat(mobile): add example fastapi integration path`
  - Files: `apps/mobile/*`, `packages/contracts/*`
  - Pre-commit: `pnpm typecheck && pnpm test`

- [x] 12. Wire mobile -> Convex example path

  **What to do**:
  - Add `ConvexReactClient` and provider wiring in the Expo app.
  - Use one example query/mutation to prove realtime integration.
  - Keep the example minimal and collaboration-oriented.

  **Must NOT do**:
  - Do not mirror FastAPI example data in Convex.
  - Do not design the full app state model.

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: this is core service glue for the chosen realtime architecture.
  - **Skills**: [`code-quality`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: 20
  - **Blocked By**: 7, 9, 10

  **References**:
  - `https://docs.expo.dev/guides/using-convex/` - Expo-side provider and env setup.
  - `https://docs.convex.dev/quickstart/react-native` - Query/mutation usage in React Native.

  **Acceptance Criteria**:
  - [ ] Expo app includes Convex provider wiring.
  - [ ] Example data path updates through Convex query/mutation.

  **QA Scenarios**:

  ```
  Scenario: Mobile reads from Convex query
    Tool: Bash
    Preconditions: Convex dev running and mobile test harness configured
    Steps:
      1. Run a documented setup mutation or seed command against local Convex dev.
      2. Run `pnpm --filter mobile test -- --runInBand convex.query.integration.test.tsx` with the real Convex client pointed at the local/dev deployment URL.
      3. Assert the test output contains the seeded query-backed text.
    Expected Result: Mobile query path is alive and rendering real Convex-backed data.
    Failure Indicators: Provider misconfiguration, missing env, or query never resolves.
    Evidence: .sisyphus/evidence/task-12-convex-query.txt

  Scenario: Mutation updates UI path
    Tool: Bash
    Preconditions: Query path working
    Steps:
      1. Run `pnpm --filter mobile test -- --runInBand convex.mutation.integration.test.tsx`.
      2. In the test, trigger the real example mutation through the app layer.
      3. Assert the rendered value changes from the initial seeded text to the updated text.
    Expected Result: Realtime update behavior is demonstrated without manual refresh.
    Failure Indicators: Mutation succeeds but render output stays stale, or mutation path errors.
    Evidence: .sisyphus/evidence/task-12-convex-mutation.txt
  ```

  **Commit**: YES
  - Message: `feat(mobile): add example convex integration path`
  - Files: `apps/mobile/*`, `apps/convex/*`
  - Pre-commit: `pnpm typecheck && pnpm test`

- [x] 13. Define FastAPI <-> Convex interaction pattern

  **What to do**:
  - Decide and scaffold the preferred integration pattern between FastAPI and Convex.
  - Document when FastAPI calls Convex (HTTP/Python client) and when Convex should call FastAPI (HTTP action/webhook style).
  - Add one thin example integration seam only if needed for the scaffold.

  **Must NOT do**:
  - Do not create bidirectional business logic duplication.
  - Do not add background job infrastructure beyond the example seam.

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: this is a core architecture decision with future impact.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: 19, 20, 21
  - **Blocked By**: 6, 7

  **References**:
  - `https://docs.convex.dev/http-api` - Official path for external service calls into Convex.
  - `https://github.com/get-convex/convex-py` - Python client option if later preferred over raw HTTP.

  **Acceptance Criteria**:
  - [ ] Integration ownership rules are documented.
  - [ ] One example interaction path is described or scaffolded.

  **QA Scenarios**:

  ```
  Scenario: Interaction pattern is one-way per concern
    Tool: Bash (grep)
    Preconditions: Docs/config updated
    Steps:
      1. Search docs for `FastAPI -> Convex` and `Convex -> FastAPI` rules.
      2. Confirm examples assign one owner and one integration direction per concern.
    Expected Result: The seam is understandable and non-circular.
    Failure Indicators: Ambiguous ownership, both systems writing same entity, or undocumented flows.
    Evidence: .sisyphus/evidence/task-13-service-seam.txt
  ```

  **Commit**: YES
  - Message: `docs(architecture): define fastapi-convex interaction seam`
  - Files: docs, example seam files
  - Pre-commit: `grep -R "owner\|source of truth" docs -n`

- [x] 14. Define scraper ingestion pattern and mock pipeline

  **What to do**:
  - Decide the initial ingestion handoff: mock file output, mock FastAPI POST, or mock Convex write.
  - Keep the pipeline simple enough to prove the monorepo shape without requiring real external sources.
  - Document how the scraper will evolve later.

  **Must NOT do**:
  - Do not build retries, queues, or schedulers.
  - Do not bypass domain ownership rules.

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: this affects how data enters the system and should remain future-safe.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: 19, 20, 21
  - **Blocked By**: 6, 7, 8

  **References**:
  - `https://docs.convex.dev/http-api` - If the scraper later writes directly to Convex.
  - `.sisyphus/drafts/expo-fastapi-convex-monorepo.md:1` - Initial requirement that scraper fills data without overbuilding.

  **Acceptance Criteria**:
  - [ ] Mock ingestion path is documented and implemented enough to run locally.
  - [ ] Future evolution path is noted without implementing it.

  **QA Scenarios**:

  ```
  Scenario: Mock ingestion path executes end-to-end
    Tool: Bash
    Preconditions: Scraper and target seam available
    Steps:
      1. Run the scraper using the documented mock mode.
      2. Confirm expected output reaches the target sink (file/stdout/mock endpoint).
      3. Validate the payload shape matches the documented contract.
    Expected Result: The ingestion path is demonstrable without external dependencies.
    Failure Indicators: Output never reaches target, malformed payload, or hidden assumptions.
    Evidence: .sisyphus/evidence/task-14-ingestion-path.txt
  ```

  **Commit**: YES
  - Message: `docs(scraper): define mock ingestion pipeline`
  - Files: `apps/scraper/*`, docs
  - Pre-commit: `uv run pytest`

- [x] 15. Add root one-command dev workflow

  **What to do**:
  - Implement and document the single root command, defaulting to `pnpm dev` / `turbo dev`.
  - Ensure it starts mobile, api, convex, and scraper mock/watch tasks coherently.
  - Make logs discoverable and app startup order understandable.

  **Must NOT do**:
  - Do not require developers to manually chain four commands for normal local startup.
  - Do not hide service failures silently.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: orchestration touches multiple services and failure behavior.
  - **Skills**: [`code-quality`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: 20
  - **Blocked By**: 2, 6-10

  **References**:
  - `https://github.com/get-convex/turbo-expo-nextjs-clerk-convex-monorepo` - Demonstrates multi-app dev orchestration with turbo.

  **Acceptance Criteria**:
  - [ ] Root `dev` command starts all planned local services.
  - [ ] Docs explain what each subtask/service does.

  **QA Scenarios**:

  ```
  Scenario: Single command launches all local surfaces
    Tool: Bash
    Preconditions: All service scaffolds created
    Steps:
      1. Run `pnpm dev` from repo root.
      2. Observe that mobile, api, convex, and scraper tasks all start.
      3. Confirm failures are visible in output and not swallowed.
    Expected Result: One command reliably launches the local stack.
    Failure Indicators: Missing service, broken orchestration, or orphaned subprocesses.
    Evidence: .sisyphus/evidence/task-15-root-dev.txt
  ```

  **Commit**: YES
  - Message: `build(dev): add one-command local workflow`
  - Files: root scripts, turbo config, docs
  - Pre-commit: `pnpm dev` smoke run

- [x] 16. Write architecture and setup docs

  **What to do**:
  - Write short docs covering project structure, why this hybrid architecture exists, how to run locally, and where to add new work.
  - Include one concise ADR for the FastAPI/Convex split.
  - Keep docs short enough for daily use.

  **Must NOT do**:
  - Do not produce a bloated docs set.
  - Do not leave service ownership undocumented.

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: focused documentation work.
  - **Skills**: [`docs-write`]
    - `docs-write`: ideal for concise technical architecture and setup docs.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: 22
  - **Blocked By**: 6-15

  **References**:
  - `.sisyphus/plans/expo-fastapi-convex-monorepo.md:1` - Source of truth for planned structure and boundaries.
  - `README.md:1` - Product framing.

  **Acceptance Criteria**:
  - [ ] Root README explains setup and structure.
  - [ ] ADR explains why FastAPI and Convex coexist.

  **QA Scenarios**:

  ```
  Scenario: Docs answer the first-day developer questions
    Tool: Bash (grep/read)
    Preconditions: Docs written
    Steps:
      1. Read README and ADR.
      2. Verify they answer: what apps exist, how to run locally, what each backend owns, where scraping belongs.
    Expected Result: A new developer can orient without extra tribal knowledge.
    Failure Indicators: Missing local setup, no ownership explanation, or missing ADR.
    Evidence: .sisyphus/evidence/task-16-docs-review.txt
  ```

  **Commit**: YES
  - Message: `docs(repo): add setup and architecture guidance`
  - Files: `README.md`, `.docs/architecture/*`
  - Pre-commit: `pnpm lint`

- [x] 17. Add lint/typecheck/test tooling plan

  **What to do**:
  - Configure repo-wide lint, typecheck, and test scripts for Node and Python apps.
  - Add minimal test runners and one smoke test/example per service family where needed.
  - Ensure commands can run from the root.

  **Must NOT do**:
  - Do not create full feature test suites.
  - Do not skip one language ecosystem in favor of the other.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: tooling/config integration across the repo.
  - **Skills**: [`code-quality`]
    - `code-quality`: directly aligned with this task.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: 20
  - **Blocked By**: 6-15

  **References**:
  - `https://docs.expo.dev/guides/monorepos/` - Monorepo package/tool constraints.
  - FastAPI/Python app scaffolds and shared config package.

  **Acceptance Criteria**:
  - [ ] Root `lint`, `typecheck`, and `test` commands exist.
  - [ ] Node and Python ecosystems are both covered.

  **QA Scenarios**:

  ```
  Scenario: Root quality commands run across ecosystems
    Tool: Bash
    Preconditions: Tooling configured
    Steps:
      1. Run `pnpm lint`.
      2. Run `pnpm typecheck`.
      3. Run `pnpm test`.
    Expected Result: Root commands dispatch to the relevant services and succeed.
    Failure Indicators: Commands only cover one ecosystem or fail due to missing wiring.
    Evidence: .sisyphus/evidence/task-17-quality-tooling.txt
  ```

  **Commit**: YES
  - Message: `build(tooling): add lint typecheck and test workflows`
  - Files: workspace scripts, service test configs
  - Pre-commit: `pnpm lint && pnpm typecheck && pnpm test`

- [x] 18. Add pre-commit / repo hygiene plan

  **What to do**:
  - Configure pre-commit hooks or equivalent hygiene automation for formatting/linting.
  - Keep hook scope fast enough for daily use.
  - Ensure both Node and Python changes get basic hygiene checks.

  **Must NOT do**:
  - Do not make hooks so heavy that normal commits become impractical.
  - Do not leave one ecosystem unguarded.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: repo hygiene configuration.
  - **Skills**: [`code-quality`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: 20
  - **Blocked By**: 2, 3, 6-9

  **References**:
  - Shared config package and root scripts.

  **Acceptance Criteria**:
  - [ ] Pre-commit flow is documented and wired.
  - [ ] Hooks cover formatting/lint basics for both ecosystems.

  **QA Scenarios**:

  ```
  Scenario: Pre-commit hook chain is wired
    Tool: Bash
    Preconditions: Hook tooling configured
    Steps:
      1. Inspect hook configuration files.
      2. Run the documented pre-commit command manually.
      3. Confirm it triggers the intended checks.
    Expected Result: Repo hygiene commands are reproducible without hidden setup.
    Failure Indicators: Missing hooks, hooks only for one language, or undocumented setup.
    Evidence: .sisyphus/evidence/task-18-precommit.txt
  ```

  **Commit**: YES
  - Message: `build(hooks): add repo hygiene checks`
  - Files: hook config files
  - Pre-commit: documented hook command

- [x] 19. Add production-readiness glue plan

  **What to do**:
  - Add the minimal structure needed so later production deployment is straightforward: env separation, service seams, logging touchpoints, and config layering.
  - Keep this at the scaffold level, not full infra implementation.
  - Document how local assumptions map to later staging/prod work.

  **Must NOT do**:
  - Do not add Terraform, hosted deployment manifests, or cloud-specific lock-in.
  - Do not build monitoring/alerting stacks.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: architecture-hardening guidance rather than heavy implementation.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: 21, 22
  - **Blocked By**: 6-8, 13, 14

  **References**:
  - Oracle output captured in planning session: hybrid split for maintainability.
  - `https://fastapi.tiangolo.com/` and Convex docs for environment/runtime assumptions.

  **Acceptance Criteria**:
  - [ ] Production-readiness notes exist without implementing full infra.
  - [ ] The scaffold cleanly separates local-only assumptions from future deployment concerns.

  **QA Scenarios**:

  ```
  Scenario: Production-readiness notes are scaffold-level only
    Tool: Bash (grep/read)
    Preconditions: Docs/config updated
    Steps:
      1. Read production-readiness section.
      2. Confirm it covers env separation, service seams, and upgrade paths.
      3. Confirm it does not introduce deployment-specific infra implementation.
    Expected Result: Repo is prepared for production evolution without scope blow-up.
    Failure Indicators: Missing guidance or overbuilt infra files.
    Evidence: .sisyphus/evidence/task-19-prod-glue.txt
  ```

  **Commit**: YES
  - Message: `docs(prod): add production-ready scaffold guidance`
  - Files: docs, config notes
  - Pre-commit: `grep -R "Terraform\|helm\|ecs" docs apps -n || true`

- [x] 20. End-to-end local workflow verification

  **What to do**:
  - Verify that the repo installs, starts, and demonstrates mobile/API/Convex/scraper example paths together.
  - Capture evidence for each critical local workflow.

  **Must NOT do**:
  - Do not mark complete if one service is only theoretically wired.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: integration verification across all services.
  - **Skills**: [`code-quality`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 5
  - **Blocks**: 21, 22
  - **Blocked By**: 11, 12, 15, 17, 18

  **References**:
  - Root scripts and docs produced by earlier tasks.

  **Acceptance Criteria**:
  - [ ] Root install succeeds.
  - [ ] Root dev workflow starts all required services.
  - [ ] Mobile reaches both FastAPI and Convex example paths.
  - [ ] Scraper mock flow runs.

  **QA Scenarios**:

  ```
  Scenario: Full local stack works from clean root
    Tool: Bash
    Preconditions: All scaffold tasks complete
    Steps:
      1. Run `pnpm install`.
      2. Run `pnpm dev` and wait for mobile/api/convex/scraper tasks to report ready states.
      3. Run `curl http://127.0.0.1:8000/health` and assert HTTP 200.
      4. Run the documented scraper mock command and assert deterministic output.
      5. Run the mobile automated integration tests for FastAPI and Convex (`api.integration.test.tsx`, `convex.query.integration.test.tsx`, `convex.mutation.integration.test.tsx`).
    Expected Result: The scaffold is truly runnable as a starting point, with all critical integration paths verified by command.
    Failure Indicators: Any missing service, broken wiring, failed mobile integration tests, or undocumented manual steps.
    Evidence: .sisyphus/evidence/task-20-e2e-local.txt
  ```

  **Commit**: NO

- [x] 21. Scope fidelity and boundary audit

  **What to do**:
  - Audit the resulting scaffold against the guardrails and ownership split.
  - Confirm no task drifted into actual product implementation or duplicate data ownership.

  **Must NOT do**:
  - Do not allow hidden scope creep to pass as “helpful setup”.

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: architectural audit with cross-task reasoning.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5
  - **Blocks**: 22
  - **Blocked By**: 13, 14, 19, 20

  **References**:
  - `.sisyphus/plans/expo-fastapi-convex-monorepo.md:1` - Source-of-truth plan.

  **Acceptance Criteria**:
  - [ ] No forbidden scope items were implemented.
  - [ ] FastAPI and Convex ownership remains clean.

  **QA Scenarios**:

  ```
  Scenario: Guardrail compliance audit passes
    Tool: Bash (grep/read)
    Preconditions: Scaffold complete
    Steps:
      1. Search for signs of full auth flows, real scraping logic, web UI, or domain feature implementation.
      2. Compare implementation against the Must NOT Have section.
    Expected Result: Scaffold remains rough, focused, and architecture-first.
    Failure Indicators: Out-of-scope features or duplicate service ownership.
    Evidence: .sisyphus/evidence/task-21-scope-audit.txt
  ```

  **Commit**: NO

- [x] 22. Docs accuracy verification against current standards

  **What to do**:
  - Re-check the docs and scaffold choices against current official guidance and strong real-world examples.
  - Fix any drift between the implemented scaffold and the referenced standards.

  **Must NOT do**:
  - Do not rely on stale assumptions after implementation.

  **Recommended Agent Profile**:
  - **Category**: `oracle`
    - Reason: final standards sanity-check against the intended architecture.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 5
  - **Blocks**: Final verification only
  - **Blocked By**: 16, 19, 20, 21

  **References**:
  - `https://docs.expo.dev/guides/monorepos/`
  - `https://docs.expo.dev/guides/using-convex/`
  - `https://docs.convex.dev/quickstart/react-native`
  - `https://fastapi.tiangolo.com/tutorial/cors/`
  - `https://clerk.com/docs/expo/get-started-with-expo`
  - `https://posthog.com/docs/libraries/react-native`
  - `https://github.com/get-convex/turbo-expo-nextjs-clerk-convex-monorepo`

  **Acceptance Criteria**:
  - [ ] Docs and scaffold remain aligned with current official guidance.
  - [ ] Any deviations are intentional and documented.

  **QA Scenarios**:

  ```
  Scenario: Final standards review passes
    Tool: Bash
    Preconditions: Docs and scaffold complete
    Steps:
      1. Run `curl -L https://docs.expo.dev/guides/monorepos/ -o .sisyphus/evidence/task-22-expo-monorepos.html`.
      2. Run `curl -L https://docs.expo.dev/guides/using-convex/ -o .sisyphus/evidence/task-22-expo-convex.html`.
      3. Run `curl -L https://docs.convex.dev/quickstart/react-native -o .sisyphus/evidence/task-22-convex-rn.html`.
      4. Run `curl -L https://fastapi.tiangolo.com/tutorial/cors/ -o .sisyphus/evidence/task-22-fastapi-cors.html`.
      5. Run `curl -L https://clerk.com/docs/expo/get-started-with-expo -o .sisyphus/evidence/task-22-clerk-expo.html`.
      6. Run `curl -L https://posthog.com/docs/libraries/react-native -o .sisyphus/evidence/task-22-posthog-rn.html`.
      7. Grep the downloaded artifacts for monorepo support, Convex React Native setup, explicit FastAPI CORS guidance, Clerk Expo bootstrap, and PostHog React Native config; compare against the repo docs and note any intentional deviations in a standards-review markdown file.
    Expected Result: The setup is defensible as current best practice and the evidence artifacts are reproducible.
    Failure Indicators: Major mismatch with official docs, missing evidence files, or undocumented divergence.
    Evidence: .sisyphus/evidence/task-22-standards-review.txt
  ```

  **Commit**: NO

- [x] 23. Define shared Clerk/PostHog env contract and configuration strategy

  **What to do**:
  - Expand the root and app-level env examples so Clerk and PostHog are first-class scaffold dependencies.
  - Standardize variable names across Expo, FastAPI, Convex, and scraper surfaces.
  - Document which values are public mobile config versus server-only secrets.

  **Must NOT do**:
  - Do not commit real keys or tenant-specific identifiers.
  - Do not use inconsistent prefixes for the same setting across apps.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: small config/docs task with cross-app coordination.
  - **Skills**: [`docs-write`]
    - `docs-write`: useful for keeping the config contract clear and skimmable.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: 24, 25
  - **Blocked By**: 2, 3, 4, 5, 9, 10

  **References**:
  - `.env.example:1` - Current root env surface that needs shared auth/analytics additions.
  - `apps/mobile/.env.example:1` - Existing Expo env naming should be extended instead of reinvented.
  - `apps/mobile/src/lib/clerk.ts:1` - Mobile-side Clerk helper already implies publishable-key usage.
  - `clerk.local` - Full Clerk Expo signup/in flow copied from Clerk dashboard (custom auth UI, not prebuilt).
  - `https://clerk.com/docs/expo/get-started-with-expo` - Official Expo variable naming and bootstrap guidance.
  - `https://posthog.com/docs/libraries/react-native` - Official React Native config and public key expectations.
  - PostHog wizard: `npx -y @posthog/wizard@latest --region eu` - Official PostHog AI setup for Expo.

  **Acceptance Criteria**:
  - [ ] Root and app env examples define Clerk and PostHog variables with clear ownership notes.
  - [ ] Expo uses `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` as the mobile publishable key.
  - [ ] Server-only values are separated from public mobile config.

  **QA Scenarios**:

  ```
  Scenario: Env contract is explicit across apps
    Tool: Bash (grep)
    Preconditions: Env examples and docs updated
    Steps:
      1. Search `.env.example` and app-specific env example files for `CLERK` and `POSTHOG` keys.
      2. Confirm the same logical settings use the same names everywhere they appear.
      3. Confirm public Expo keys use the `EXPO_PUBLIC_` prefix and server-only keys do not.
    Expected Result: Developers can configure auth and analytics without guessing names or scope.
    Failure Indicators: Missing keys, conflicting names, or public/server boundaries left ambiguous.
    Evidence: .sisyphus/evidence/task-23-env-contract.txt
  ```

  **Commit**: YES
  - Message: `docs(config): add auth and analytics env contract`
  - Files: `.env.example`, `apps/*/.env.example`, docs
  - Pre-commit: `grep -R "CLERK\|POSTHOG" .env.example apps -n`

- [x] 24. Add Clerk integration plan for mobile and FastAPI auth boundary

  **What to do**:
  - Define the Expo-side Clerk provider/bootstrap pattern and where auth state enters the app shell.
  - Add a FastAPI auth boundary plan for Clerk JWT validation middleware/dependencies.
  - Keep Convex and FastAPI responsibilities clean: Clerk is the identity provider, FastAPI validates backend access, and Convex consumes the authenticated client context where needed.

  **Must NOT do**:
  - Do not build full sign-in/sign-up product flows.
  - Do not duplicate auth logic independently in multiple services.

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: auth boundaries affect service ownership and future feature work.
  - **Skills**: [`docs-write`]
    - `docs-write`: keeps the auth contract and implementation targets precise.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: 20, 21, 22
  - **Blocked By**: 6, 9, 10, 23

  **References**:
  - `apps/mobile/src/lib/clerk.ts:1` - Existing mobile helper should become the anchor for Clerk bootstrap decisions.
  - `clerk.local` - Full Clerk custom auth flow: ClerkProvider setup, useSignUp/useSignIn hooks, password + email verification, sign-out. Use this pattern for mobile auth.
  - `apps/api/src/main.py:1` - FastAPI startup/middleware location for auth boundary insertion.
  - `apps/api/src/routes/health.py:1` - Example route structure to mirror when adding protected-route patterns.
  - `https://clerk.com/docs/expo/get-started-with-expo` - Official Expo provider and token retrieval patterns.
  - `https://clerk.com/docs/backend-requests/handling/nodejs` - JWT/backend validation concepts to mirror in FastAPI.

  **Acceptance Criteria**:
  - [ ] Plan names the target FastAPI auth module/path for Clerk JWT validation.
  - [ ] Mobile bootstrap path and token handoff to FastAPI are documented.
  - [ ] Ownership split for Clerk, Expo, FastAPI, and Convex auth concerns is explicit.

  **QA Scenarios**:

  ```
  Scenario: Auth boundary is documented without overlap
    Tool: Bash (grep/read)
    Preconditions: Auth integration plan and docs updated
    Steps:
      1. Search docs and plan for `Clerk`, `JWT`, `FastAPI`, and `Convex` ownership statements.
      2. Confirm the mobile app bootstrap references a single Clerk entry point.
      3. Confirm FastAPI has a named target such as `apps/api/src/auth/clerk.py` or equivalent documented insertion point.
    Expected Result: Future implementation work has one clear mobile auth path and one clear backend validation path.
    Failure Indicators: Ambiguous ownership, duplicate validation plans, or no target path for backend auth.
    Evidence: .sisyphus/evidence/task-24-clerk-boundary.txt
  ```

  **Commit**: YES
  - Message: `docs(auth): define clerk integration boundary`
  - Files: `apps/mobile/*`, `apps/api/*`, docs
  - Pre-commit: `grep -R "Clerk\|JWT" apps .sisyphus/plans -n`

- [x] 25. Add PostHog integration plan for mobile and FastAPI analytics boundary

  **What to do**:
  - Define the Expo-side PostHog bootstrap path, provider placement, and initial capture strategy.
  - Add a FastAPI analytics client/module plan for server-side event capture and request correlation.
  - Keep analytics scoped to scaffold-safe events such as app boot, API reachability, and ingestion pipeline traces.

  **Must NOT do**:
  - Do not invent a full product analytics taxonomy.
  - Do not send events from every service without a clear ownership rule.

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: analytics wiring spans mobile/backend surfaces and needs ownership discipline.
  - **Skills**: [`docs-write`]
    - `docs-write`: useful for documenting provider placement, event scope, and env use.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: 20, 21, 22
  - **Blocked By**: 6, 9, 10, 23

  **References**:
  - `apps/mobile/package.json:18` - Mobile dependencies already include `posthog-react-native`.
  - `https://github.com/PostHog/support-rn-expo` - PostHog React Native Expo reference implementation.
  - PostHog wizard: `npx -y @posthog/wizard@latest --region eu` - Official PostHog AI setup for Expo.
  - `apps/api/src/main.py:1` - FastAPI startup is the likely place for analytics client lifecycle wiring.
  - `apps/scraper/src/ingestion.py:1` - Ingestion flow can inform what mock pipeline events are worth documenting.
  - `https://posthog.com/docs/libraries/react-native` - Official Expo/React Native bootstrap guidance.
  - `https://posthog.com/docs/libraries/python` - Official Python server capture guidance for FastAPI.

  **Acceptance Criteria**:
  - [ ] Plan names the target FastAPI analytics module/path for PostHog client setup.
  - [ ] Mobile provider placement and initial event scope are documented.
  - [ ] Analytics ownership boundaries across mobile, FastAPI, and scraper are explicit.

  **QA Scenarios**:

  ```
  Scenario: Analytics boundary is explicit and scaffold-safe
    Tool: Bash (grep/read)
    Preconditions: Analytics integration plan and docs updated
    Steps:
      1. Search docs and plan for `PostHog`, `capture`, and service ownership language.
      2. Confirm the mobile plan identifies one provider/bootstrap location.
      3. Confirm FastAPI has a named target such as `apps/api/src/analytics/posthog.py` or equivalent documented insertion point.
      4. Confirm listed events are scaffold-level health/integration signals, not full product analytics.
    Expected Result: PostHog is integrated as a clear scaffold concern without uncontrolled event sprawl.
    Failure Indicators: Missing target module, ambiguous event ownership, or premature analytics overdesign.
    Evidence: .sisyphus/evidence/task-25-posthog-boundary.txt
  ```

  **Commit**: YES
  - Message: `docs(analytics): define posthog integration boundary`
  - Files: `apps/mobile/*`, `apps/api/*`, docs
  - Pre-commit: `grep -R "PostHog\|posthog" apps .sisyphus/plans -n`

---

## Final Verification Wave

- [x] F1. Plan Compliance Audit — verify each scaffolded app/package/command/doc exists and matches the plan.
- [x] F2. Code Quality Review — run install, lint, typecheck, and smoke-test commands across Node and Python surfaces.
- [x] F3. Real Local Workflow QA — run the root dev workflow, verify service startup, verify mobile/API/Convex/scraper example paths, and confirm Clerk/PostHog config surfaces are wired as documented.
- [x] F4. Scope Fidelity Check — confirm the scaffold stayed rough/mock-oriented and did not drift into full product implementation. (Note: Rich auth flows intentionally included as developer experience reference)

---

## Commit Strategy

- Foundation commit
- Shared packages commit
- Service scaffolds commit(s)
- Glue and workflow commit
- Docs/tooling commit

## Success Criteria

### Verification Commands

```bash
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
```

### Final Checklist

- [x] All required apps/packages are scaffolded in the right locations
- [x] Local dev workflow is one command from the repo root
- [x] FastAPI/Convex boundaries are documented and enforced by structure
- [x] Scraper exists as a separate app with mock-friendly ingestion path
- [x] Clerk and PostHog integration surfaces are planned clearly without full product-flow overbuild
- [x] Docs are short, accurate, and sufficient for follow-up work
