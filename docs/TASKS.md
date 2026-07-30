# Execution Backlog

## Interactive Digital Booklet Learning Platform

| Metadata | Nilai |
| --- | --- |
| Status baseline | Approved for execution |
| Tanggal persetujuan | 30 Juli 2026 |

Dokumen ini adalah backlog dependency-ordered. Semua task berstatus `PLANNED`
sampai Product Owner menyetujui baseline. Baseline disetujui pada 30 Juli 2026.
ID task stabil dan dipakai pada commit, PR, ADR, serta laporan verifikasi.

## Status

- `PLANNED`: belum mendapat izin eksekusi.
- `READY`: Definition of Ready terpenuhi.
- `IN PROGRESS`: sedang dikerjakan pada satu boundary.
- `BLOCKED`: konflik/authority/dependency eksternal mencegah progres.
- `DONE`: acceptance dan verification proof lulus.
- `DEFERRED`: dipindahkan keluar MVP melalui keputusan Product Owner.

### Status Eksekusi Saat Ini

| Task | Status | Bukti/catatan |
| --- | --- | --- |
| GOV-001 | DONE | `APPROVALS.md`; seluruh baseline berstatus approved |
| FND-001 | DONE | `FOUNDATION-VERIFICATION.md`; Docker hanya memblokir FND-007 |
| FND-002 | DONE | Git `main`, ignore/editor conventions, hygiene scan |
| FND-003 | DONE | Lockfile tunggal dan Turbo dry-run tervalidasi |
| FND-004 | DONE | Strict shared config, framework-free config, dan negative compiler fixture lulus |
| FND-005 | DONE | Zero-warning lint dan boundary-policy contract tests lulus |
| FND-006 | DONE | Gate lokal dan hosted clean-checkout Quality run `30553017485` lulus |
| FND-007 | IN PROGRESS | Docker/PostgreSQL/MinIO healthy; immutable image pinning masih harus ditutup |

## Task Fields

| Field | Arti |
| --- | --- |
| Boundary | Package/app/dokumentasi pemilik utama |
| Depends | Task yang harus selesai terlebih dahulu |
| Result | Outcome yang harus tersedia, bukan daftar file spekulatif |
| Proof | Bukti minimum sebelum task menjadi `DONE` |

## Gate 0 — Approval dan Scope Lock

| ID | Boundary | Depends | Result | Proof |
| --- | --- | --- | --- | --- |
| GOV-001 | docs | — | Product Owner menyetujui PRD, architecture, ecosystem matching, licenses, agent rules, implementation plan, dan backlog | Status dokumen dan approval record konsisten |
| GOV-002 | docs | GOV-001 | Keputusan password reset, search, notification history, PDF, dark mode, deployment, error tracking, dan retention dicatat | Decision log/ADR tanpa ambiguity MVP |
| GOV-003 | docs | GOV-001 | ADR awal menetapkan monorepo, modular monolith, content snapshot, API style, auth/session, dan storage boundary | ADR direview terhadap source of truth |

## Phase 0A — Repository Foundation

| ID | Boundary | Depends | Result | Proof |
| --- | --- | --- | --- | --- |
| FND-001 | repository | GOV-001 | Preflight Git, Node LTS, Corepack, pnpm, Docker, ports, dan filesystem selesai; gap lingkungan terdokumentasi | Version output aktual; keputusan Node/pnpm; Docker blocker terselesaikan |
| FND-002 | repository | FND-001 | Git repository dan ignore/editor conventions tersedia tanpa mengubah artefak user | Tidak ada nested Git, secret, env, node_modules, atau generated output ter-track |
| FND-003 | repository | FND-001 | Root pnpm workspace dan Turborepo task graph tersedia | Satu lockfile; `workspace:*`; Turbo dry-run valid |
| FND-004 | `packages/config-typescript` | FND-003 | Strict browser/node TypeScript configurations tersedia | Compiler flags wajib aktif; negative type fixture membuktikan guard |
| FND-005 | `packages/config-eslint` | FND-003 | ESLint/format policy zero-warning dan forbidden-pattern checks tersedia | Lint mendeteksi `any`, unsafe imports, dan boundary violation yang relevan |
| FND-006 | CI/tooling | FND-003, FND-004, FND-005 | CI frozen install, format, lint, typecheck, test, build, dan license gate tersedia | Clean checkout pipeline hijau tanpa skip tersembunyi |
| FND-007 | local infrastructure | FND-001 | PostgreSQL dan MinIO development mempunyai reproducible startup/healthcheck/data-volume policy | Healthcheck lulus; credential development tidak di-commit |
| FND-008 | `packages/observability` | FND-003 | Typed config, structured logging, correlation ID, dan secret redaction foundation tersedia | Unit test redaction/correlation; tidak ada sensitive log fixture |

## Phase 0B — Contracts dan Dependency Spikes

| ID | Boundary | Depends | Result | Proof |
| --- | --- | --- | --- | --- |
| CON-001 | `packages/content-schema` | FND-004 | `PageDocument` v1 dan MVP block discriminated union menjadi framework-free contract | Valid/invalid fixture tests; exhaustive `never`; zero `any` |
| CON-002 | `packages/content-schema` | CON-001 | Migrator registry dan unknown-block policy tersedia | Fixture versi lama termigrasi; unknown block aman dan observable |
| CON-003 | `packages/api-contracts`, `apps/api` | FND-004 | API error envelope, request ID, idempotency header, dan OpenAPI generation contract ditetapkan | Contract generation deterministic; frontend tidak menduplikasi DTO |
| CON-004 | `packages/database` | FND-007 | Prisma/PostgreSQL boundary dan migration policy tersedia tanpa frontend import | Integration smoke test; import-boundary check; reviewed initial migration |
| CON-005 | `packages/ui` | FND-004 | Design tokens, typography, spacing, focus, reduced-motion, dan primitive ownership ditetapkan | Visual/a11y fixture pada 360 px dan desktop |
| SPK-001 | `packages/flipbook-engine` | CON-001, CON-005 | Spike A membuktikan/menolak StPageFlip pada React 19 StrictMode dan 60-page fixture | Lifecycle/event/cleanup/orientation/interactive-region contract tests + ADR |
| SPK-002 | `packages/block-editor` | CON-001, CON-005 | Spike B membuktikan typed registry, 100-block reorder, keyboard DnD, undo/redo, autosave cancellation, overflow | Measured spike report + interaction/accessibility tests + ADR |
| SPK-003 | upload boundary | FND-007, CON-003 | Spike D membuktikan Uppy headless + presigned S3 flow, abort/retry, validation, dan orphan cleanup | Integration fixture + failure paths + license/advisory record |
| SPK-004 | `packages/ui` | CON-005 | Spike E memvalidasi Radix/shadcn focus, Motion reduced-motion, accessible chart summary, contrast, dan token parity | Automated a11y + manual visual matrix |
| SPK-005 | reminder boundary | CON-004 | Spike C memvalidasi recurrence, timezone, DST, deduplication, denied permission, dan missed occurrence | Deterministic timezone fixtures + ADR |

## Phase 1 — Author-to-Reader Vertical Slice

| ID | Boundary | Depends | Result | Proof |
| --- | --- | --- | --- | --- |
| VS-001 | `apps/api` auth module | CON-003, CON-004, FND-008 | Admin login/logout/refresh/RBAC dengan Argon2id dan secure refresh cookie | Integration tests untuk valid/invalid/rate-limit/logout/role; no localStorage token |
| VS-002 | `packages/database`, `apps/api` booklet module | CON-004 | Booklet, revision, chapter, page, explicit ordering, dan status invariants tersedia | PostgreSQL integration tests termasuk uniqueness dan invalid transitions |
| VS-003 | media boundary | SPK-003, VS-001 | Cover/image upload melalui presigned URL dan allowlist tersedia | MIME/size/abort/retry/unauthorized/orphan tests |
| VS-004 | `packages/block-renderer` | CON-001, CON-002, CON-005 | Heading, paragraph, dan image dirender dari validated JSON ke safe DOM | Same-fixture component tests; unknown/invalid fallback; alt-text rules |
| VS-005 | `packages/block-editor` | SPK-002, VS-002, VS-003, VS-004 | Editor minimum heading/paragraph/image dengan stable ID, reorder, validation, undo/redo, autosave status | Keyboard DnD, debounce/cancel/error/overflow tests |
| VS-006 | `apps/api` publishing use case | VS-002, VS-005 | Publish memvalidasi schema/media dan membuat immutable snapshot atomik | Real PostgreSQL transaction tests termasuk rollback/failure/retry |
| VS-007 | `apps/admin` | VS-001, VS-005, VS-006 | Admin composition untuk create/edit/preview/publish minimum tersedia | Component tests + admin Playwright journey |
| VS-008 | `packages/flipbook-engine` | SPK-001, VS-004 | Production adapter memiliki typed controller, lifecycle, event mapping, logical-page mapping, dan vertical fallback | Contract tests terhadap exact locked version |
| VS-009 | `apps/web` | VS-006, VS-008 | Published catalogue/detail/reader dengan responsive single/double-page, controls, TOC/thumbnail minimum, reduced motion | Draft URL denied; keyboard/touch/orientation/fallback tests |
| VS-010 | progress use case + `apps/web` | VS-009 | Guest local resume dan authenticated-ready revision/page progress contract tersedia | Page ID survives orientation/index changes; monotonic/idempotent tests |
| VS-011 | cross-app E2E | VS-007, VS-009, VS-010 | Vertical slice release candidate terbukti end-to-end | Playwright `create → preview → publish → read → resume`; 60-page performance fixture |

## Phase 2 — Interactive Learning

| ID | Boundary | Depends | Result | Proof |
| --- | --- | --- | --- | --- |
| INT-001 | media/video module | VS-011 | Stored video dan allowlisted YouTube metadata/playback tersedia dengan lazy load | CSP/provider rejection, no sound autoplay, responsive media tests |
| INT-002 | progress use case | INT-001, VS-010 | Video progress tersimpan idempotent dan selesai pada 90% | Throttling/deduplication/zero-duration/error tests |
| INT-003 | myth-fact module + renderer | VS-011 | Myth/fact CRUD dan reusable accessible reveal block tersedia | Label non-color-only, reduced-motion, source link, draft visibility tests |
| INT-004 | `packages/quiz-engine`, content schema | VS-011 | Typed question/answer/trigger contracts untuk multiple choice, true/false, dan image question tersedia | Discriminated-union fixtures dan keyboard interaction tests |
| INT-005 | quiz API use case | INT-004, VS-001 | Server-authoritative scoring, idempotent attempt, retry policy, dan zero-score persistence tersedia | Tampered client score rejected; PostgreSQL integration tests |
| INT-006 | reader + quiz integration | INT-005, VS-008 | Quiz muncul setelah stable post-flip state, sekali per revision/learner, lalu mengembalikan page/focus | Flip-race, close/restore, retry, keyboard, reduced-motion tests |
| INT-007 | progress use case | INT-002, INT-005, INT-006 | Page 3-second visibility, quiz, video, dan booklet completion memakai satu domain definition | Fake-clock/domain tests; revision history tidak berubah |
| INT-008 | analytics ingestion | CON-003, INT-007 | Minimum event vocabulary tervalidasi, idempotent, consent-aware, dan server-timestamped | Invalid metadata rejected; dedupe and privacy tests |
| INT-009 | cross-app E2E | INT-001–INT-008 | Interactive learning journey terbukti | Playwright `read → video → myth/fact → quiz → complete → resume` |

## Phase 3 — TTD Adherence

| ID | Boundary | Depends | Result | Proof |
| --- | --- | --- | --- | --- |
| TTD-001 | auth/profile module | VS-001 | Learner role, profile timezone, dan authenticated progress/session tersedia | RBAC/session/timezone validation integration tests |
| TTD-002 | reminder domain/API | SPK-005, TTD-001 | Reminder schedule dan occurrence model mempunyai IANA timezone serta deduplication key | Bangkok/Jakarta/DST/late/missed deterministic tests |
| TTD-003 | scheduler infrastructure | TTD-002 | Due-schedule scan idempotent dan observable tanpa client timer sebagai authority | Concurrent/retry/duplicate occurrence integration tests |
| TTD-004 | notification UI | TTD-002, CON-005 | Permission `default/granted/denied`, explicit user gesture, dan in-app fallback tersedia | Browser API adapter tests dan denied-state accessibility |
| TTD-005 | adherence domain/API | TTD-002 | `TAKEN`, `MISSED`, `SKIPPED`, correction window, dan unique local-date invariant tersedia | Formula/uniqueness/authorization/timezone integration tests |
| TTD-006 | calendar UI wrapper + learner app | TTD-005, SPK-004 | Monthly calendar, status, streak, range adherence, dan accessible locale Indonesia tersedia | Keyboard/day labels/empty/error/timezone component tests |
| TTD-007 | cross-app E2E | TTD-003–TTD-006 | Reminder-to-calendar journey terbukti termasuk notification denied | Playwright schedule → fallback → record → calendar update |

## Phase 4 — Analytics dan Admin Completion

| ID | Boundary | Depends | Result | Proof |
| --- | --- | --- | --- | --- |
| ANA-001 | analytics domain/API | INT-008, TTD-005 | Metric definitions dan server-side date/timezone aggregates tersedia | Query integration tests termasuk anonymous health aggregation |
| ANA-002 | `packages/ui/charts` | SPK-004, ANA-001 | Typed Recharts wrappers mempunyai loading/empty/partial/error states dan text summary | Component accessibility tests; no raw chart-library leak |
| ANA-003 | `apps/admin` | ANA-001, ANA-002 | Dashboard date-range metrics untuk reader, completion, quiz, adherence aggregate, dan session duration tersedia | Metric-definition links; range/timezone Playwright tests |
| ANA-004 | admin audit/operations | VS-001, ANA-001 | Login/publish/unpublish/delete audit trail dan privacy-safe admin views tersedia | Authorization/audit/redaction tests |
| ANA-005 | Product Owner scope gate | GOV-002, VS-011 | Search dan persisted notification history berstatus `READY` atau `DEFERRED`, bukan scope implisit | Decision record; task lanjutan hanya dibuat jika approved |

## Phase 5 — Hardening dan Release

| ID | Boundary | Depends | Result | Proof |
| --- | --- | --- | --- | --- |
| REL-001 | all frontend boundaries | INT-009, TTD-007, ANA-003 | WCAG 2.2 AA audit dan remediation alur kritis selesai | Automated + keyboard + screen-reader matrix; no critical violations |
| REL-002 | learner/admin/web performance | VS-011, INT-009 | LCP, INP, bundle, CLS, 60-page reader, dan 100-block editor memenuhi budget | Reproducible measured report sebelum/sesudah |
| REL-003 | API/storage/security | ANA-004 | Threat review, auth abuse tests, CSP, upload, rate limit, dependency advisory, dan secret handling selesai | Tidak ada open high-severity finding |
| REL-004 | privacy/data lifecycle | GOV-002, ANA-004 | Consent, retention, export/delete personal data, disclaimer, dan sensitive-data logging policy diterapkan | Privacy acceptance tests dan redaction review |
| REL-005 | infrastructure/operations | FND-007, REL-003 | Production deployment, migrations, healthcheck, observability, alerts, dan runbook tersedia | Staging deployment smoke test |
| REL-006 | backup/restore | REL-005 | PostgreSQL dan object storage backup/restore direhearsal | Timestamped restore evidence dan integrity check |
| REL-007 | rollback | REL-005 | App rollback dan forward-only database recovery path direhearsal | Staging rollback evidence tanpa data loss |
| REL-008 | full regression | REL-001–REL-007 | Frozen install, all gates, all builds, contract/integration/E2E suites lulus | Signed verification report dengan actual command results |
| REL-009 | UAT | REL-008 | UAT konten anemia/TTD lulus pada mobile dan desktop | Product Owner acceptance + defect disposition |
| REL-010 | release | REL-009 | Release candidate dipromosikan dengan changelog, notices, deployment, dan rollback readiness | Production smoke check dan release record |

## Deferred Backlog

Item berikut tidak boleh dikerjakan sebagai MVP kecuali Product Owner mengubah
scope:

- PDF-to-editable import dan PDF/embed block;
- free-form Canva-like design editor;
- real-time multi-editor collaboration;
- native mobile apps dan full offline PWA;
- WhatsApp/SMS/email reminder dan guaranteed background delivery;
- AI summary/question generation;
- gamification, certification, marketplace, multi-tenancy, dan billing;
- microservices, Kafka, Kubernetes, Elasticsearch/Meilisearch sebelum kebutuhan
  terukur;
- Anime.js sebelum ada approved complex SVG/timeline requirement dan ADR.

## Recommended First Execution Batch

Setelah `GOV-001` selesai, batch pertama hanya:

1. `FND-001` — environment and version preflight;
2. `FND-002` — Git and repository hygiene;
3. `FND-003` — root workspace;
4. `FND-004` dan `FND-005` — strict shared config;
5. `FND-006` — CI baseline.

Batch ini tidak membuat fitur aplikasi dan sesuai dengan current phase constraint.
