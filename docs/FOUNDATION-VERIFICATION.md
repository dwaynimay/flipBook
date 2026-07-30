# Foundation Verification Record

## Scope

| Field | Value |
| --- | --- |
| Date | 30 July 2026 |
| Tasks | GOV-001, FND-001–FND-006 |
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
| Docker | Unavailable | Blocks FND-007 only; no system software was installed |
| Free space on `D:` | `132722397184` bytes | Sufficient for foundation install |
| Ports | `3000`, `3001`, `3002`, `5432`, `9000`, `9001` available | No current port collision |
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

The installed inventory contains 93 exact package-version records across six
observed license identifiers. The canonical allowlist is
`tooling/scripts/licenses-allowlist.json`. The gate fails when a package,
version, or license differs and separately rejects all license identifiers
outside the approved permissive set; a synchronized prohibited record therefore
still fails. `BlueOak-1.0.0` is accepted only for `minimatch@10.2.6`.
Platform-specific Turborepo binaries form an exact alternative group covering
the locked Windows, Linux, and Darwin variants: exactly one approved variant
must be installed.

## Quality-Gate Evidence

| Command | Result |
| --- | --- |
| `corepack pnpm install --frozen-lockfile` | Pass; lockfile unchanged |
| `corepack pnpm run format:check` | Pass |
| `$env:TURBO_FORCE='true'; corepack pnpm run lint` | Pass uncached; 3/3 workspace tasks, zero warnings |
| `$env:TURBO_FORCE='true'; corepack pnpm run typecheck` | Pass uncached; 3/3 workspace tasks |
| `$env:TURBO_FORCE='true'; corepack pnpm run test` | Pass uncached; strict/framework-free compiler fixtures, browser/React preset contracts, ESLint boundary contracts, prohibited-license tests, and exact cross-platform inventory tests |
| `$env:TURBO_FORCE='true'; corepack pnpm run build` | Pass uncached; 3/3 workspace tasks |
| `corepack pnpm run license:check` | Pass; 93 exact installed package-version records |
| `corepack pnpm exec turbo run build --dry=json` | Pass; 3 valid build tasks |
| `corepack pnpm exec turbo run typecheck --dry=json` | Pass; ESLint config and repository tooling both depend on `@booklet/typescript-config#typecheck` |
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
| FND-001 | DONE | Actual preflight above; Docker isolated to FND-007 |
| FND-002 | DONE | Git, ignore, EditorConfig, and hygiene checks |
| FND-003 | DONE | pnpm workspace, lockfile, Turbo graph and dry-run |
| FND-004 | DONE | Browser/node/react/framework-free config and failing strict negative fixture |
| FND-005 | DONE | Flat ESLint config and contracts for nested/generic/union JSDoc `any`, wrapped as/angle-bracket double assertions, page-flip isolation, browser API, all-workspace deep imports, and root/subpath dependency boundaries |
| FND-006 | DONE | Local gates pass and hosted clean-checkout Quality run `30553017485` passed |

## Known Blockers and Deferred Work

- FND-007 is now in progress: Docker, PostgreSQL, and MinIO are healthy, but
  container image versions still require immutable pinning before the
  reproducibility criterion is closed.
- Root scripts intentionally expose only real owners: build, format,
  format-check, license-check, lint, test, and typecheck. Dev, clean, and E2E
  scripts will be added only when an owning app/package implements them.
- TypeScript 7 remains deferred until `typescript-eslint` declares a compatible
  peer range and the upgrade passes a dedicated dependency review.
- Product decisions in GOV-002 and architecture ADRs in GOV-003 remain outside
  this approved batch.

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
