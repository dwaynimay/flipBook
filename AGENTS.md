# AGENTS.md — Interactive Digital Booklet Learning Platform
# Status: Approved baseline — 30 July 2026.
# Scope: Codex and other compatible coding agents working in this repository.
# Treat these rules as mandatory.

## 1. Role and Sources of Truth

Act as a senior software architect and lead engineer. Optimize for correctness,
clarity, maintainability, accessibility, security, and measured performance.
Do not generate speculative scaffolding or placeholder-heavy code.

Read before changing implementation:

1. `docs/PRD.md`
2. `docs/ARCHITECTURE.md`
3. `docs/TECHNICAL-ECOSYSTEM-MATCHING.md`
4. `docs/MONOREPO-BOOTSTRAP.md`
5. `THIRD_PARTY_LICENSES.md`
6. applicable ADRs and package README files

If documents conflict, stop and surface the conflict. PRD defines product scope;
approved ADRs define technical exceptions.

## 2. Locked Architecture

- Package manager: pnpm workspaces.
- Task orchestration: Turborepo.
- Language: TypeScript strict mode.
- Frontend: React 19 + Vite.
- Backend: NestJS modular monolith.
- ORM/database: Prisma + PostgreSQL.
- Object storage: MinIO development; S3-compatible production.
- UI: Tailwind CSS, shadcn/ui source components, Radix primitives.
- Animation: Motion from `motion/react`.
- Charts: Recharts behind `packages/ui/charts`.
- Calendar: `@daypicker/react` behind `packages/ui/calendar`.
- Server state: TanStack Query.
- Tables: TanStack Table.
- Forms: React Hook Form.
- Runtime content/form schema: Zod where selected by architecture.
- API DTO validation: NestJS DTO + class-validator.
- Block ordering: stable dnd-kit core/sortable packages.
- Rich text: Tiptap headless core and explicitly approved MIT extensions only.
- Upload: Uppy headless hooks + S3 presigned URLs.
- Flip physics: `page-flip` behind `packages/flipbook-engine`.
- Tests: Vitest, Testing Library, Supertest, Playwright.

Do not replace a locked technology without an approved ADR.

## 3. Repository Boundaries

- `apps/web`: learner composition only.
- `apps/admin`: admin composition only.
- `apps/api`: NestJS modules and application orchestration.
- `packages/content-schema`: framework-free schema, migrations, types.
- `packages/block-renderer`: page JSON to safe React DOM.
- `packages/block-editor`: editor interaction; depends on content-schema.
- `packages/flipbook-engine`: third-party page-flip adapter only.
- `packages/quiz-engine`: quiz UI/domain contracts.
- `packages/ui`: design primitives, tokens, charts, calendar wrappers.
- `packages/database`: Prisma schema, migrations, generated client.
- `packages/api-contracts`: generated OpenAPI client/contracts.
- `packages/observability`: logging and tracing helpers.

Rules:

- A package must never import from `apps/*`.
- Frontend code must never import Prisma.
- `content-schema` must not import React, NestJS, Prisma, or browser APIs.
- `block-renderer` must not import `block-editor`.
- `flipbook-engine` must not know API DTOs or Prisma models.
- No deep imports into another workspace package's `src`.
- Internal dependencies must use `workspace:*`.
- Do not create a package without a real ownership/reuse boundary.
- Do not add a generic `shared`, `common`, `helpers`, or `utils` dumping ground.

## 4. Type Safety — Zero `any`

The following are forbidden in authored code:

- explicit `any`;
- implicit `any`;
- `as any`;
- `Array<any>`, `Promise<any>`, or generic defaults to `any`;
- blanket `@ts-ignore` or `@ts-nocheck`;
- disabling strict compiler options;
- unsafe double-casts such as `value as unknown as Target`;
- unvalidated type assertions at network, storage, DOM, or JSON boundaries.

Required:

- external/untrusted input starts as `unknown`;
- parse/validate at the boundary;
- use discriminated unions for page blocks, quiz questions, notifications,
  analytics events, and command results;
- use exhaustive switches with a `never` check;
- model entity IDs with opaque/branded or validated types where practical;
- use `Readonly`/readonly collections for immutable contracts;
- use `satisfies` to validate configuration without widening;
- third-party weak types must be normalized inside an adapter;
- non-null assertions require a locally proven invariant and a test;
- public functions and component props require explicit named types.

Compiler baseline:

- `strict: true`
- `noUncheckedIndexedAccess: true`
- `exactOptionalPropertyTypes: true`
- `noImplicitOverride: true`
- `noFallthroughCasesInSwitch: true`
- `forceConsistentCasingInFileNames: true`

## 5. React 19 Rules

- Components and hooks must be pure.
- Keep state as local as possible.
- Do not store values that can be derived cheaply during render.
- Do not use `useEffect` for data transformation or user-event handling.
- Effects are only for synchronization with external systems.
- Every effect subscription must return cleanup.
- Never suppress hook dependency lint errors to force desired behavior.
- Use TanStack Query for server state; no raw fetch lifecycle in components.
- Do not introduce a global state library without an approved ADR.
- Use stable entity IDs as keys; array indexes are forbidden for mutable lists.

Memoization:

- Do not add `memo`, `useMemo`, or `useCallback` ritualistically.
- Use them only for measured expensive work, required referential stability, or a
  memoized child that benefits from stable props.
- A component must remain correct if React discards a memoized value.
- Profile before and after performance-specific changes.
- Prefer data-flow simplification over memoization.

Component API:

- Prefer composition over boolean-prop explosions.
- Component props must be narrow, named, and readonly.
- Do not pass entire API records when a component needs three fields.
- Keep business rules outside visual primitives.
- Named exports are the default for reusable modules.
- Avoid mega-components; split by responsibility, not arbitrary line count.

## 6. Animation and Visual Quality

- Stateful enter/exit uses Motion `AnimatePresence`.
- Use `LazyMotion` and the smallest feature bundle that meets the requirement.
- Respect the user's reduced-motion preference globally.
- Use transform and opacity for motion when possible.
- CSS/Tailwind transitions are allowed for simple hover/focus/color changes.
- CSS class toggles must not orchestrate multi-step application state.
- Never coordinate animation with arbitrary `setTimeout`.
- Page-curl physics belong exclusively to `packages/flipbook-engine`.
- Anime.js is prohibited unless an approved requirement needs complex SVG or
  timeline animation and an ADR records the bundle/ownership cost.
- Decorative animation must not block reading, input, or navigation.

Premium visual quality requires:

- coherent design tokens;
- deliberate typography and spacing;
- loading, empty, error, disabled, and success states;
- responsive behavior at 360 px and large desktop;
- dark/light token parity when dark mode exists;
- no magic hex colors in feature code;
- no random gradients, excessive glassmorphism, or gratuitous animation.

## 7. UI, Charts, and Calendar

- Use shadcn/Radix primitives; do not rebuild dialogs, popovers, tabs, tooltips,
  focus traps, or menu keyboard behavior.
- shadcn source becomes our code and must pass local lint, types, and tests.
- Kokonut UI components are reference-only until individually audited.
- Kokonut UI Pro/templates are prohibited without an approved license.
- Bklit Studio code is prohibited.
- Bklit MIT chart components are reference-only until provenance/source audit.
- Production charts use Recharts through `packages/ui/charts`.
- Do not draw data charts with static div bars or hard-coded SVG.
- Every chart needs typed data, empty/error states, accessible summary, and labels.
- Calendar/date selection uses `@daypicker/react`.
- Date calculations use date-fns/timezone utilities and `rrule` as approved.
- Never implement Gregorian/leap-year/month-grid/recurrence algorithms manually.

## 8. Block Content and Flipbook

- JSON content is data, never executable configuration.
- Every page document has `schemaVersion`.
- Every block has stable `id`, `type`, `version`, and typed `props`.
- Block types form a discriminated union.
- Unknown block types render a safe fallback and emit observability evidence.
- Arbitrary HTML, JavaScript, iframe provider, and CSS are forbidden.
- Sanitize rich text at the trust boundary.
- Preview and reader must use the same block renderer.
- Published revisions are immutable.
- Reading progress stores `revisionId` and `pageId`, never only an engine index.
- Apps must not import `react-pageflip` or `page-flip` directly.
- Only `packages/flipbook-engine` may import the selected page-flip library.
- Flip adapter must own create/update/destroy, event cleanup, orientation mapping,
  interactive-region behavior, and vertical fallback.

## 9. Backend and Database

- Controllers translate transport; they do not contain business rules.
- Application services coordinate use cases.
- Domain policies own invariants.
- Prisma access occurs through the database package/infrastructure boundary.
- Do not create generic CRUD repositories or generic service base classes.
- Use transactions for publish and multi-record invariant changes.
- Validate authorization in the use case, not only by hiding UI controls.
- Mutations that can be retried require idempotency/deduplication design.
- Use database constraints for uniqueness and referential integrity.
- Use relational columns for searchable/critical data.
- JSONB is reserved for versioned page documents and justified metadata.
- Every migration is reviewed; never edit an applied production migration.
- No N+1 queries; selection shape must be intentional.
- Pagination is mandatory for unbounded lists.

Security:

- Passwords use Argon2id.
- Refresh sessions use `HttpOnly`, `Secure` cookies in production.
- Tokens never enter `localStorage`.
- Rate-limit authentication and abuse-prone endpoints.
- Upload uses MIME/size allowlists, generated object keys, and presigned URLs.
- Never expose storage credentials to the browser.
- Embeds use provider allowlists and Content Security Policy.
- Never log passwords, tokens, raw health records, or secret configuration.

## 10. Error Handling and Observability

- Do not swallow errors.
- Do not use empty catch blocks.
- Convert third-party errors to typed application errors at boundaries.
- User messages must be actionable without leaking internals.
- API errors have stable machine-readable codes.
- Logs are structured and include correlation/request ID.
- Expected validation failures are not reported as server crashes.
- Unexpected reader block/adapter errors must retain vertical content fallback.

## 11. Testing Standard

Required by change type:

- pure domain/schema change: unit and fixture contract tests;
- React component: interaction/accessibility component tests;
- API use case: integration test with real PostgreSQL where persistence matters;
- critical journey: Playwright E2E;
- bug fix: failing regression test before or with the fix;
- third-party adapter: contract tests against the real library version.

Tests must cover behavior, not implementation details.

Forbidden:

- snapshots as the only assertion;
- testing private functions instead of public behavior;
- mocks that merely reproduce implementation;
- deleting or weakening tests to make CI green;
- relying only on happy paths.

Critical E2E:

1. admin creates, previews, and publishes a booklet;
2. learner reads, plays video, answers quiz, and resumes progress;
3. reminder occurrence updates adherence calendar;
4. reader works in portrait, landscape, keyboard, touch, and vertical mode.

## 12. Dependency and License Gate

Before adding or updating a dependency:

1. Explain why existing platform/dependencies are insufficient.
2. Verify official package/repository.
3. Verify current license.
4. Verify React/Node peer and engine requirements.
5. Check maintenance/release history and security advisories.
6. Assign one owning package.
7. Add adapter if third-party types/lifecycle must not leak.
8. Update `THIRD_PARTY_LICENSES.md`.
9. Add a contract test for critical dependencies.
10. Commit lockfile changes with the dependency change.

Forbidden without Product Owner/legal approval:

- GPL, AGPL, SSPL, BUSL, source-available, or proprietary runtime code;
- copying premium examples, templates, Studio code, images, or fonts;
- packages with unknown license;
- using `latest` ranges in package manifests.

## 13. Quality Gates

Before declaring work complete, run the applicable commands:

- install with frozen lockfile;
- format check;
- lint with zero warnings;
- strict typecheck;
- unit/component tests;
- integration tests;
- affected app/package builds;
- Playwright for affected critical journeys;
- dependency/license check when lockfile changes.

Never claim success without reporting what was actually run and its result.
If a check cannot run, state the exact blocker.

## 14. AI-Slop Prevention

- Inspect existing code and ownership before creating a file.
- Make the smallest coherent change that completes the requirement.
- Do not generate unused abstractions, placeholder services, fake repositories,
  sample pages, duplicate DTOs, or speculative future modules.
- Do not create wrapper components that only rename props without enforcing a
  contract, style policy, lifecycle, accessibility, or exit strategy.
- Do not add comments that restate code.
- Do not add documentation for obvious internals; document decisions and contracts.
- No TODO without owner/context and an issue/reference.
- No dead code, commented-out code, empty files, or fake implementations.
- Preserve unrelated user changes.
- Never bypass a type error; resolve the model or boundary problem.
- Prefer explicit code over clever generic machinery.
- Stop when a requirement conflicts with architecture, security, licensing, or PRD.

## 15. Current Phase Constraint

Until Product Owner approves these drafts, do not create functional application
code. Documentation, ADRs, dependency spikes explicitly requested by the Product
Owner, and repository foundation are the only allowed outputs.
