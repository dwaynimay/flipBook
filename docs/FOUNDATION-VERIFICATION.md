# Foundation Verification Record

## Scope

| Field | Value |
| --- | --- |
| Date | 6 August 2026 |
| Tasks | GOV-001–GOV-003, FND-001–FND-008 |
| Repository | `D:\Github\flipBook` |
| Feature code | None |

## Environment Preflight

| Check | Actual result | Decision |
| --- | --- | --- |
| Node.js | `v24.18.0`, LTS `Krypton` | Supported baseline; root engine is `>=24.0.0` |
| npm | `11.16.0` | Observed only; pnpm remains the locked package manager |
| Corepack | `0.35.0` | Available |
| pnpm on ambient PATH | `11.9.0` | Not used; Codex runtime fallback precedes Corepack shims |
| pnpm through Corepack | `11.18.0` | Locked and used for install/checks |
| Git | `2.55.0.windows.3` | Repository initialized on `main` |
| WSL | `docker-desktop`, version 2, running | WSL 2 backend available |
| Docker | Client/server `29.6.2`; Compose `v5.3.1` | Local infrastructure verified |
| Free space on `D:` | `132722397184` bytes | Sufficient for foundation install |
| Ports | PostgreSQL `5432`; MinIO API `9000`; console `9001` | Healthy services bind only to `127.0.0.1` |
| Nested Git repositories | None | Pass |
| Pre-existing lock/env/node_modules | None | Pass |

Use `corepack pnpm` in this environment. Plain `pnpm` resolves to the Codex
runtime fallback version and correctly fails the exact `engines.pnpm` guard.

## Version and License Decisions

Registry metadata was queried before the lockfile was generated.

| Dependency | Locked version | License | Engine/peer decision |
| --- | --- | --- | --- |
| pnpm | `11.18.0` | MIT | Requires Node `>=22.13`; Node 24.18 passes |
| turbo | `2.10.7` | MIT | Root task orchestrator |
| TypeScript | `6.0.3` | Apache-2.0 | Selected instead of 7.0.2 to satisfy `typescript-eslint <6.1.0` |
| ESLint | `10.8.0` | MIT | Supports Node 24 |
| `@eslint/js` | `10.0.1` | MIT | Peer requires ESLint 10 |
| `typescript-eslint` | `8.65.0` | MIT | ESLint 10 supported; TypeScript range `>=4.8.4 <6.1.0` |
| Prettier | `3.9.6` | MIT | Supports Node `>=14` |
| `@types/node` | `24.13.3` | MIT | Matches Node 24 tooling baseline |
| minimatch (transitive) | `10.2.6` | BlueOak-1.0.0 | Permissive license recorded; tooling only |
| Pino | `10.3.1` | MIT | Structured logger implementation isolated by `@booklet/observability` |
| Zod | `4.4.3` | MIT | Runtime parsing for typed observability config; public contracts do not expose Zod types |
| Vitest | `4.1.10` | MIT | Observability unit and contract tests |
| Lightning CSS (transitive) | `1.33.0` | MPL-2.0 | Exact development-only Vitest/Vite tooling exception; not exported or distributed by the package |
| brace-expansion (transitive) | `5.0.9` | MIT | Narrow workspace override closes GHSA-rgw5-rvv9-x895 in the tooling graph |

The installed inventory contains 148 exact package-version records across seven
observed license identifiers. The canonical allowlist is
`tooling/scripts/licenses-allowlist.json`. The gate fails when a package,
version, or license differs and separately rejects all license identifiers
outside the approved permissive set; a synchronized prohibited record therefore
still fails. `BlueOak-1.0.0` is accepted only for `minimatch@10.2.6`.
MPL-2.0 is accepted only for the exact development-only Lightning CSS records
documented in `THIRD_PARTY_LICENSES.md` and requires renewed review if any such
code is distributed. Platform-specific Turborepo binaries form an exact
alternative group covering the locked Windows, Linux, and Darwin variants;
Rolldown and Lightning CSS use equivalent exact platform-alternative groups.
Exactly one approved variant per group must be installed.
The production-only inventory contains 103 package-version records across six
license identifiers. A separate production gate mechanically rejects the exact
MPL-2.0 Lightning CSS packages if they move from the development graph into the
production graph.

## Local Infrastructure Evidence

| Check | Actual result |
| --- | --- |
| Compose validation | `docker compose config --quiet` passed |
| PostgreSQL image | `postgres:17.10-alpine3.24@sha256:742f40ea20b9ff2ff31db5458d127452988a2164df9e17441e191f3b72252193` |
| MinIO image | `minio/minio:RELEASE.2025-09-07T16-13-09Z@sha256:14cea493d9a34af32f524e538b8346cf79f3321eff8e708c1e2960462bd8936e` |
| Registry resolution | Both human-readable tags resolved to the exact recorded multi-platform manifest digests |
| Runtime identity | Both container `ConfigImage` and image ID matched the pins; Compose-generated names are used without `container_name` |
| Runtime binding | PostgreSQL `127.0.0.1:5432`; MinIO `127.0.0.1:9000` and `127.0.0.1:9001`; no wildcard/IPv6 publication |
| PostgreSQL health | Container healthy; `postgres (PostgreSQL) 17.10`; `SELECT 1` returned `1` |
| MinIO health | Container healthy; release `RELEASE.2025-09-07T16-13-09Z`; `/minio/health/live` returned HTTP `200` |
| PostgreSQL volume | `flipbook_postgres_data` at `/var/lib/postgresql/data`; created 30 July 2026 |
| MinIO volume | `flipbook_minio_data` at `/data`; created 30 July 2026 |
| Recreate persistence | Temporary PostgreSQL row and MinIO file survived forced container recreate; container IDs changed and named volumes remained |
| Restart persistence | The same temporary markers survived service restart and return to healthy state |
| Cleanup | Temporary table/file removed and verified absent |
| Clean bootstrap | Unique project `flipbookfnd007clean20260731`, new volumes, and alternate loopback ports `15432`, `19000`, `19001` passed health, SQL, and HTTP checks |
| Temporary cleanup | Container/volume project labels and exact names were verified before cleanup; temporary resources are absent and main volumes are unchanged |
| Local environment | `.env` absent, ignored, and untracked; `.env.example` contains documented loopback-only defaults and prohibits real/private credentials |

No volume deletion command was used. The image pins reproduce the reviewed
content across supported platforms while the release tags preserve human
readability.

MinIO Community Server reports GNU AGPLv3. The Product Owner approved its
unmodified local-development use on 31 July 2026 under
`docs/adr/ADR-008-local-object-storage.md`. This does not approve MinIO for
staging, production, redistribution, modification, or a hosted service.

Docker Scout `v1.23.1` was run against the exact local images. PostgreSQL
reported 1 critical and 16 high findings, all marked fixable. MinIO reported 21
critical and 43 high findings, of which 19 critical and 35 high were marked
fixable. Official PostgreSQL 17.10 Trixie and Bookworm variants were worse at 2
critical and 18 high each; MinIO `latest` resolves to the current pinned digest
and Scout provides no newer recommendation. The results and options are recorded
in `docs/FND-007-IMAGE-SECURITY-TRIAGE.md`. No security risk acceptance is
inferred from local-only controls or the AGPL approval. The Product Owner
separately accepted the residual risk temporarily for these exact digests,
owns the risk, prohibits staging/production and sensitive data, and requires
review no later than 31 August 2026 or when a newer official image becomes
available.

## FND-008 Observability Evidence

| Check | Actual result |
| --- | --- |
| Package boundary | `@booklet/observability` is a Node-only workspace package with explicit public exports and generated declarations |
| Typed config | Zod parses untrusted runtime environment input into the named `ObservabilityConfig` contract and returns typed, non-sensitive validation errors |
| Structured logging | Pino is normalized behind the nominal `StructuredLogger` class, `LogFields`, and `LogSink`; chained context accumulates with deterministic child overrides and no Pino or Zod type appears in the public API |
| Correlation ID | Incoming IDs are bounded and character-validated; invalid input receives a generated ID; the nominal value object is revalidated before a system-owned top-level correlation binding is created |
| Secret redaction | Keyed structured fields cover recursive records, arrays, accumulated child context, normalized key variants, dates, cycles, and prototype-tainted records. Raw Error/AggregateError message, stack, and string-cause content is omitted; error type and recursively safe metadata remain. Unsupported non-plain objects become an explicit safe placeholder. |
| Tests | Vitest passed 4 test files and 33 tests covering config, nominal/runtime logger and correlation issuance contracts, reflected-constructor rejection, context ownership, logging, safe error projection, and redaction |
| Dependency security | `brace-expansion@>=5.0.0 <5.0.9` is narrowly overridden to patched `5.0.9`; `corepack pnpm audit --audit-level high` reports no known package vulnerabilities |

Pino and Zod are implementation details of this boundary. Consumers depend on
project-owned contracts, so third-party logger and schema types cannot leak into
apps or other packages. The package audit result is separate from the accepted
local-container advisories recorded for FND-007. Redaction is an enforceable
defense for keyed structured fields, not a content scanner for interpolated or
free-form messages; callers must keep sensitive values out of message strings
and log an approved machine `errorCode` separately when classification is
needed. The Error projection intentionally does not retain third-party message
or stack text.

## Quality-Gate Evidence

| Command | Result |
| --- | --- |
| `corepack pnpm install --frozen-lockfile` | Pass; lockfile unchanged |
| `corepack pnpm run format:check` | Pass |
| `$env:TURBO_FORCE='true'; $env:TURBO_CONCURRENCY='1'; corepack pnpm run lint` | Pass uncached; 4/4 workspace tasks, zero warnings |
| `$env:TURBO_FORCE='true'; $env:TURBO_CONCURRENCY='1'; corepack pnpm run typecheck` | Pass uncached; 4/4 workspace tasks |
| `$env:TURBO_FORCE='true'; $env:TURBO_CONCURRENCY='1'; corepack pnpm run test` | Pass uncached; 4/4 workspace test owners; observability contributed 4 Vitest files/33 tests in addition to compiler, ESLint, and license-policy contracts |
| `$env:TURBO_FORCE='true'; $env:TURBO_CONCURRENCY='1'; corepack pnpm run build` | Pass uncached; 4/4 workspace tasks |
| `corepack pnpm run license:check` | Pass; 148 exact installed package-version records across 7 approved licenses; production inventory 103 records across 6 licenses |
| `corepack pnpm exec turbo run build --dry=json` | Pass; 4 valid build tasks |
| `corepack pnpm exec turbo run typecheck --dry=json` | Pass; 4 valid typecheck tasks and workspace dependency ordering preserve the shared TypeScript config boundary |
| `corepack pnpm audit --audit-level high` | Pass; no known vulnerabilities |
| Lockfile/hygiene scan | Pass; one root `pnpm-lock.yaml`, no nested Git/env/foreign lockfile |

The GitHub Actions workflow uses immutable commit SHAs for checkout and Node
setup, then runs the same frozen install and quality gates. Hosted clean-checkout
run `30553017485` passed on commit `7bcce6d468d4c7c1d4d0775d615ecd76da84883c`
after the repository added an explicit LF policy in `.gitattributes`.

## Task Closure

| Task | Status | Evidence |
| --- | --- | --- |
| GOV-001 | DONE | `APPROVALS.md` and consistent approved statuses |
| GOV-002 | DONE | `PRODUCT-DECISIONS.md` resolves the MVP product-scope ambiguities and aligns PRD 2.1 |
| GOV-003 | DONE | ADR-001 through ADR-009 are accepted and linked from the architecture source of truth; ADR-008 remains the narrow local-storage exception |
| FND-001 | DONE | Actual preflight above, including Docker/WSL verification |
| FND-002 | DONE | Git, ignore, EditorConfig, and hygiene checks |
| FND-003 | DONE | pnpm workspace, lockfile, Turbo graph and dry-run |
| FND-004 | DONE | Browser/node/react/framework-free config and failing strict negative fixture |
| FND-005 | DONE | Flat ESLint config and contracts for nested/generic/union JSDoc `any`, wrapped as/angle-bracket double assertions, page-flip isolation, browser API, all-workspace deep imports, and root/subpath dependency boundaries |
| FND-006 | DONE | Local gates pass and hosted clean-checkout Quality run `30553017485` passed |
| FND-007 | DONE | Reproducibility, loopback isolation, clean bootstrap, persistence, license record, ADR-008, and time-bounded Product Owner CVE risk disposition verified |
| FND-008 | DONE | Typed config, nominal structured logger/correlation boundaries with runtime issuance guards, accumulated context, safe Error projection, keyed structured-field redaction, public type isolation, 4 files/33 tests, development plus production license gates, and clean package audit verified |

## Known Risks and Deferred Work

- Container advisories remain open but are temporarily accepted by the Product
  Owner only for the exact-pinned images on loopback local development. The
  Product Owner owns the risk. Staging, production, non-loopback exposure, and
  sensitive data are prohibited. Review is mandatory no later than 31 August
  2026 or when a newer official image becomes available.
- Root scripts intentionally expose only real owners: build, format,
  format-check, license-check, lint, test, and typecheck. Dev, clean, and E2E
  scripts will be added only when an owning app/package implements them.
- TypeScript 7 remains deferred until `typescript-eslint` declares a compatible
  peer range and the upgrade passes a dedicated dependency review.
- Standing Product Owner authorization removes routine approval checkpoints for
  dependency-ordered MVP tasks. It does not waive architecture, security,
  privacy, dependency/license, quality, production-action, or scope-expansion
  gates recorded in `AGENTS.md` and `APPROVALS.md`.
- This record closes the repository foundation only. It is not evidence that
  feature acceptance, staging, release, or production-readiness gates have
  passed.

## Sources Consulted

- Project source of truth: `AGENTS.md`, `PRD.md`, `ARCHITECTURE.md`,
  `TECHNICAL-ECOSYSTEM-MATCHING.md`, `MONOREPO-BOOTSTRAP.md`,
  `IMPLEMENTATION-PLAN.md`, `TASKS.md`, and `THIRD_PARTY_LICENSES.md`.
- pnpm install/frozen lockfile and CI behavior: https://pnpm.io/cli/install and
  https://pnpm.io/continuous-integration
- Turborepo task and dry-run contracts:
  https://turborepo.com/docs/crafting-your-repository/configuring-tasks and
  https://turborepo.com/docs/reference/run
- ESLint flat config and zero-warning behavior:
  https://eslint.org/docs/latest/use/configure/configuration-files and
  https://eslint.org/docs/latest/use/command-line-interface
- typescript-eslint supported TypeScript range:
  https://typescript-eslint.io/users/dependency-versions
- Registry version/license/engine/peer metadata: `npm view` against the
  official npm registry.
- Blue Oak Model License 1.0.0:
  https://blueoakcouncil.org/license/1.0.0.html
- GitHub Actions refs and license files:
  https://github.com/actions/checkout and https://github.com/actions/setup-node
- Docker Compose interpolation, config validation, named volumes, and digest
  references: https://docs.docker.com/compose/ and
  https://docs.docker.com/dhi/core-concepts/digests/
- Official PostgreSQL image tags, initialization, and PostgreSQL 17 persistence:
  https://hub.docker.com/_/postgres
- PostgreSQL license: https://www.postgresql.org/about/licence/
- MinIO container persistence and health endpoints:
  https://github.com/minio/docs/blob/main/source/operations/deployments/baremetal-deploy-minio-as-a-container.rst
  and
  https://github.com/minio/docs/blob/main/source/operations/monitoring/healthcheck-probe.rst
- MinIO exact release and GNU AGPLv3 license:
  https://github.com/minio/minio/releases/tag/RELEASE.2025-09-07T16-13-09Z
- Docker Scout CVE and recommendation commands:
  https://docs.docker.com/reference/cli/docker/scout/cves/ and
  https://docs.docker.com/reference/cli/docker/scout/recommendations/
