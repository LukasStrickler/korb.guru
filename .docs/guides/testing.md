# Testing (mobile)

How to run and add tests for the Expo mobile app. Layers: **unit**, **integration**, **component**, **E2E** (Maestro). Flaky tests are **quarantined** and run separately.

## Layers and naming

| Layer           | Pattern                                             | Runner                 | Notes                                                                                          |
| --------------- | --------------------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------- |
| **Unit**        | `*.unit.test.{ts,tsx}`                              | Jest                   | Pure logic.                                                                                    |
| **Integration** | `*.integration.test.{ts,tsx}`                       | Jest                   | Multi-unit, mocks (MSW, `renderRouter`).                                                       |
| **Component**   | `*.component.test.{ts,tsx}`                         | Jest                   | Router/screen with mocks.                                                                      |
| **E2E**         | `.maestro/**/*.yml`                                 | Maestro                | Real app on simulator/emulator.                                                                |
| **Quarantine**  | `*.unit.flaky.test.*`, `*.integration.flaky.test.*` | Jest (separate config) | Excluded from main suite; see [Flaky tests and quarantine](#flaky-tests-and-quarantine) below. |

**Storybook** drives visual development and portable stories for Jest; see [Storybook (mobile)](storybook-mobile.md).

Tests live under **`apps/mobile/src/__tests__/`**. Do not put test files inside `src/app/` (Expo Router).

## Commands

From **repo root**: `pnpm --filter @korb/mobile test` (or `test:unit`, `test:integration`, `test:component`, `test:coverage`, `test:quarantine`, `test:mutation`, `test:e2e`). From **`apps/mobile`**: `pnpm test`, `pnpm test:unit`, etc.

| Script                                                      | Purpose                                                                                                                                              |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `test`                                                      | Main suite (unit + integration; no flaky).                                                                                                           |
| `test:unit` / `test:integration` / `test:component`         | By layer.                                                                                                                                            |
| `test:watch` / `test:unit:watch` / `test:integration:watch` | Watch mode.                                                                                                                                          |
| `test:coverage`                                             | Coverage → `apps/mobile/coverage/`.                                                                                                                  |
| `test:quarantine`                                           | Quarantined tests only (retries). See [Flaky tests and quarantine](#flaky-tests-and-quarantine).                                                     |
| `test:quarantine:stability`                                 | Run quarantine 10× to check stability before reinstating.                                                                                            |
| `test:mutation`                                             | Stryker mutation testing → `coverage/mutations/`. Requires `plugins: ["@stryker-mutator/jest-runner"]` and `inPlace: true` in `stryker.config.json`. |
| `test:e2e`                                                  | Maestro E2E (built app + simulator/emulator).                                                                                                        |

Run one file: `pnpm test -- --testPathPattern=api` (or `home.integration`).

## Coverage and mutation reports

After `test:coverage` or `test:mutation` (from `apps/mobile`), reports are written under **`apps/mobile/coverage/`**:

| Report          | Path                                                  |
| --------------- | ----------------------------------------------------- |
| Coverage (HTML) | `apps/mobile/coverage/index.html`                     |
| Coverage (JSON) | `apps/mobile/coverage/coverage-final.json`            |
| Mutation (HTML) | `apps/mobile/coverage/mutations/mutation-report.html` |
| Mutation (JSON) | `apps/mobile/coverage/mutations/mutation-report.json` |

**Serve reports (from repo root):** Run `pnpm test:reports` to start an HTTP server on port **9327**. Open http://localhost:9327 for an index with links and “last generated” timestamps. Useful for remote dev (e.g. [VS Code port forwarding](https://code.visualstudio.com/docs/editor/port-forwarding)). The server frees the port and retries if busy; missing reports show as "not generated" with commands to run—refresh after generating.

## E2E (Maestro)

Flows in **`apps/mobile/.maestro/`**. **appId** must match `app.json`. Install [Maestro CLI](https://maestro.dev/getting-started/installing-maestro), build the app, then `pnpm test:e2e`. For CI: EAS Workflows (build + Maestro).

## Adding tests

1. **Unit:** `src/__tests__/<area>/<name>.unit.test.ts`. Pure logic; no RN rendering.
2. **Integration:** `src/__tests__/<area>/<name>.integration.test.tsx`. Use `renderRouter` (expo-router/testing-library); use MSW for API (see `src/__tests__/lib/api.integration.test.ts`).
3. **Component:** `src/__tests__/<area>/<name>.component.test.tsx` for router/screen. For UI components, prefer Storybook + Jest with `composeStories` — see [Storybook (mobile)](storybook-mobile.md).
4. **Quarantine:** Rename to `*.flaky.test.*`, add issue link; run with `test:quarantine`. See [Flaky tests and quarantine](#flaky-tests-and-quarantine) to reinstate.

## Flaky tests and quarantine

Quarantine when a test fails intermittently and blocks CI or local work and fixing the root cause is deferred. Link every quarantined test to a tracking issue.

**Naming:** `*.unit.flaky.test.{ts,tsx}` or `*.integration.flaky.test.{ts,tsx}`. Main suite never runs these (`testPathIgnorePatterns`).

**Commands:** `pnpm test:quarantine` (3 retries), `pnpm test:quarantine:watch`, `pnpm test:quarantine:stability` (run 10× to check stability before reinstating). From `apps/mobile`: same script names.

**Reinstate:** Fix root cause → run `test:quarantine:stability` (all 10 pass) → rename back to `*.unit.test.*` / `*.integration.test.*` → remove issue link and run main suite. Empty quarantine: `test:quarantine` exits 1; `test:quarantine:stability` uses `--passWithNoTests`.

## See also

- [Storybook (mobile)](storybook-mobile.md) — visual + portable stories
- [Expo: Unit testing](https://docs.expo.dev/develop/unit-testing/) · [Expo Router: Testing](https://docs.expo.dev/router/reference/testing/) · [E2E with Maestro](https://docs.expo.dev/eas/workflows/examples/e2e-tests/)
