# Third-Party Software and License Register

## Interactive Digital Booklet Learning Platform

| Metadata | Nilai |
| --- | --- |
| Status | Approved baseline — dependencies locked; FND-007 local image risk accepted temporarily |
| Tanggal verifikasi | 6 Agustus 2026 |
| Scope | Dependency terpasang dan kandidat dependency produk |
| Release authority | Lockfile dan generated notice bundle |

## 1. Important Notice

Dokumen ini adalah inventaris engineering, bukan nasihat hukum. Versi di bawah adalah versi registry yang teramati pada tanggal verifikasi, bukan jaminan versi final. Setelah dependency dipasang, `pnpm-lock.yaml` dan isi license package yang benar-benar terunduh menjadi sumber release.

Tidak semua package di bagian “evaluated/conditional” akan dipasang.

## 2. License Policy

### Diizinkan

- MIT
- Apache-2.0
- BSD-2-Clause
- BSD-3-Clause
- ISC
- BlueOak-1.0.0 hanya untuk `minimatch@10.2.6`
- PostgreSQL License

### Diizinkan Bersyarat

- dual-license bila proyek memilih opsi permissive secara sah dan menyimpan notice;
- MPL-2.0 hanya setelah review file-level copyleft dan distribusi;
- source-copy component hanya jika provenance dan license text dipertahankan.
- MinIO Community Server GNU AGPLv3 hanya untuk container development lokal
  exact-version yang disetujui dalam ADR-008. Pengecualian ini tidak berlaku
  untuk staging, production, redistribusi, modifikasi, atau hosted service.

### Dilarang Tanpa Persetujuan Tertulis

- GPL/LGPL untuk runtime/browser bundle;
- AGPL;
- SSPL;
- BUSL atau source-available license;
- proprietary source, template, Studio, font, icon, image, atau animation asset;
- package tanpa license yang dapat diverifikasi.

## 3. Planned Foundation Dependencies

Versi final wajib dikunci melalui lockfile. Major version tidak boleh dinaikkan otomatis.

| Package/project | Versi teramati | License | Pemakaian | Status |
| --- | ---: | --- | --- | --- |
| pnpm | 11.18.0 | MIT | Workspace/package manager | Locked |
| Turborepo (`turbo`) | 2.10.7 | MIT | Task graph/cache | Locked |
| TypeScript | 6.0.3 | Apache-2.0 | Language/compiler | Locked; `typescript-eslint` compatible |
| ESLint | 10.8.0 | MIT | Static analysis | Locked |
| `@eslint/js` | 10.0.1 | MIT | ESLint recommended JavaScript rules | Locked |
| `typescript-eslint` | 8.65.0 | MIT | TypeScript parser and strict lint rules | Locked |
| Prettier | 3.9.6 | MIT | Deterministic formatting | Locked |
| `@types/node` | 24.13.3 | MIT | Node.js tooling types | Locked |
| Vite | 8.1.5 | MIT | Frontend build tool | Planned |
| React | 19.2.8 | MIT | Frontend runtime | Locked major |
| React DOM | 19.2.8 | MIT | DOM renderer | Locked major |
| React Router DOM | 7.18.1 | MIT | SPA routing | Planned |
| Tailwind CSS | 4.3.3 | MIT | Styling | Planned |
| shadcn CLI/source registry | 4.16.0 | MIT | Source-owned UI components | Planned |
| Radix UI packages | Per component | MIT | Accessible primitives | Planned per component |
| class-variance-authority | 0.7.1 | Apache-2.0 | Typed visual variants | Planned |
| clsx | 2.1.1 | MIT | Conditional classes | Planned |
| tailwind-merge | 3.6.0 | MIT | Class conflict resolution | Planned |
| Lucide React | 1.27.0 | ISC | Icons | Planned |

Sources:

- https://pnpm.io/
- https://turbo.build/
- https://www.typescriptlang.org/
- https://vite.dev/
- https://react.dev/
- https://ui.shadcn.com/
- https://www.radix-ui.com/
- https://lucide.dev/
- https://eslint.org/
- https://typescript-eslint.io/
- https://prettier.io/

TypeScript 7.0.2 tidak masuk lockfile foundation karena peer dependency
`typescript-eslint` 8.65.0 adalah `>=4.8.4 <6.1.0`.

### Foundation Transitive and CI Inventory

| Package/project | Versi/ref terkunci | License | Pemakaian |
| --- | --- | --- | --- |
| minimatch | 10.2.6 | BlueOak-1.0.0 | Transitive glob matching pada ESLint toolchain |
| actions/checkout | `d23441a48e516b6c34aea4fa41551a30e30af803` (`v6`) | MIT | CI checkout |
| actions/setup-node | `249970729cb0ef3589644e2896645e5dc5ba9c38` (`v6`) | MIT | CI Node.js setup |
| Vite | 8.2.0 | MIT | Transitive test transform melalui Vitest; bukan Vite app yang masih planned |
| Lightning CSS | 1.33.0 | MPL-2.0 | Transitive development-only melalui Vitest/Vite; tidak masuk runtime atau artifact `dist` |
| brace-expansion | 5.0.9 | MIT | Narrow workspace security override untuk menutup GHSA-rgw5-rvv9-x895 pada tooling graph |

BlueOak-1.0.0 dibatasi hanya untuk `minimatch@10.2.6`. Inventaris
package/version/license lengkap yang disetujui berada di
`tooling/scripts/licenses-allowlist.json`. License gate membandingkan inventory
terpasang secara exact dan secara independen menolak identifier di luar MIT,
Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, PostgreSQL, serta pengecualian
BlueOak sempit tersebut. Lightning CSS dan satu binary platform-nya diizinkan
secara exact hanya pada versi 1.33.0 sebagai transitive development tool Vitest;
source tidak disalin atau dimodifikasi dan package ini tidak diekspor oleh
`@booklet/observability`. Jika tool tersebut didistribusikan, MPL-2.0 dan source
availability obligations wajib direview ulang. Sinkronisasi package terlarang ke
allowlist tidak dapat melewati policy. Binary native Turborepo, Rolldown, dan
Lightning CSS dimodelkan sebagai grup alternatif lintas platform: tepat satu
binary dengan nama, versi, dan license yang disetujui harus terpasang per grup.
License gate juga membaca `pnpm licenses list --prod` dan menolak MPL-2.0 bila
package yang sama memasuki production dependency graph; regression test
membuktikan `lightningcss@1.33.0` gagal pada inventory production walaupun exact
version tersebut diizinkan pada inventory development.
`brace-expansion@5.0.9` menggantikan 5.0.8 melalui override yang hanya mencakup
rentang vulnerable `>=5.0.0 <5.0.9`; versi patched tetap memenuhi contract
`minimatch@10.2.6` dan tidak mengubah dependency runtime aplikasi.

### Local Infrastructure Images

| Image/project | Tag dan manifest digest terkunci | License | Pemakaian | Status |
| --- | --- | --- | --- | --- |
| PostgreSQL official image | `postgres:17.10-alpine3.24@sha256:742f40ea20b9ff2ff31db5458d127452988a2164df9e17441e191f3b72252193` | PostgreSQL License; Alpine/base notices retained in image | Database development lokal | Pinned; CVE risk accepted temporarily for loopback-only local development |
| MinIO Community Server | `minio/minio:RELEASE.2025-09-07T16-13-09Z@sha256:14cea493d9a34af32f524e538b8346cf79f3321eff8e708c1e2960462bd8936e` | GNU AGPLv3 | S3-compatible storage development lokal | Pinned under ADR-008; CVE risk accepted temporarily for loopback-only local development |

Image references use a human-readable release tag plus an immutable
multi-platform manifest digest. The digest controls the actual content; the tag
keeps the reviewed release understandable. MinIO approval is local-only and
does not change the general AGPL prohibition.

The Product Owner owns the temporary CVE risk disposition for these exact
digests. Staging, production, hosted use, non-loopback exposure, and sensitive
data are prohibited. Re-review is required no later than 31 August 2026 or when
a newer official image becomes available, whichever occurs first. See
`docs/FND-007-IMAGE-SECURITY-TRIAGE.md`.

Sources:

- https://hub.docker.com/_/postgres
- https://github.com/docker-library/postgres
- https://www.postgresql.org/about/licence/
- https://github.com/minio/minio/releases/tag/RELEASE.2025-09-07T16-13-09Z
- https://github.com/minio/minio/blob/RELEASE.2025-09-07T16-13-09Z/LICENSE
- `docs/adr/ADR-008-local-object-storage.md`

## 4. Planned Frontend and Interaction Dependencies

| Package/project | Versi teramati | License | Pemakaian | Status |
| --- | ---: | --- | --- | --- |
| `@tanstack/react-query` | 5.101.4 | MIT | Server state | Planned |
| `@tanstack/react-table` | 8.21.3 | MIT | Admin tables | Planned |
| `react-hook-form` | 7.83.0 | MIT | Forms | Planned |
| Zod | 4.4.3 | MIT | Runtime schema in `packages/observability` and `packages/content-schema` | Locked for FND-008 and CON-001 |
| Motion (`motion`) | 12.42.2 | MIT | Stateful animation | Planned |
| Recharts | 3.10.1 | MIT | Dashboard/progress charts | Planned |
| `@daypicker/react` | 10.0.1 | MIT | Calendar/date selection | Planned |
| date-fns | 4.4.0 | MIT | Date calculation/format | Planned |
| rrule | 2.8.1 | BSD-3-Clause | Reminder recurrence | Planned |
| `@dnd-kit/core` | 6.3.1 | MIT | Drag/drop core | Planned |
| `@dnd-kit/sortable` | 10.0.0 | MIT | Chapter/block sorting | Planned |
| `@tiptap/react` | 3.29.1 | MIT | Headless rich-text integration | Planned core only |
| `@tiptap/starter-kit` | 3.29.1 | MIT | Approved core editor extensions | Planned with extension audit |
| DOMPurify | 3.4.12 | MPL-2.0 OR Apache-2.0 | HTML sanitization | Conditional; use Apache-2.0 option |
| Uppy Core | 5.2.0 | MIT | Upload state | Planned |
| Uppy React | 5.2.0 | MIT | Headless upload hooks | Planned |
| Uppy AWS S3 | 5.1.0 | MIT | Direct S3-compatible upload | Planned |
| Sonner | 2.0.7 | MIT | Transient toast | Planned |
| cmdk | 1.1.1 | MIT | Command/search UI | Planned |

Sources:

- https://tanstack.com/query/
- https://tanstack.com/table/
- https://react-hook-form.com/
- https://zod.dev/
- https://motion.dev/
- https://recharts.github.io/
- https://daypicker.dev/
- https://date-fns.org/
- https://github.com/jkbrzt/rrule
- https://dndkit.com/
- https://tiptap.dev/
- https://github.com/cure53/DOMPurify
- https://uppy.io/
- https://sonner.emilkowal.ski/
- https://github.com/pacocoursey/cmdk

## 5. Flipbook Dependencies

| Package/project | Versi teramati | License | Pemakaian | Status |
| --- | ---: | --- | --- | --- |
| StPageFlip (`page-flip`) | 2.0.7 | MIT | Page physics through internal adapter | Planned after spike |
| `react-pageflip` | 2.0.3 | MIT | React wrapper candidate | Evaluated; not approved/installed |

Conditions:

- only `packages/flipbook-engine` may import the selected engine;
- React 19 StrictMode/lifecycle contract tests are mandatory;
- app code may not depend on third-party engine types;
- vertical semantic reader remains available.

Source: https://github.com/Nodlik/StPageFlip

## 6. Planned Backend Dependencies

| Package/project | Versi teramati | License | Pemakaian | Status |
| --- | ---: | --- | --- | --- |
| NestJS Core | 11.1.28 | MIT | API framework | Locked major |
| NestJS Platform Express | 11.1.28 | MIT | HTTP adapter | Planned |
| NestJS Swagger | 11.4.6 | MIT | OpenAPI generation | Planned |
| NestJS JWT | 11.0.2 | MIT | Token service | Planned |
| NestJS Passport | 11.0.5 | MIT | Auth integration | Planned |
| NestJS Schedule | 6.1.3 | MIT | MVP schedule scan | Planned |
| NestJS Throttler | 6.5.0 | MIT | Rate limiting | Planned |
| Prisma CLI | 7.9.1 | Apache-2.0 | Schema/migrations | Locked major |
| Prisma Client | 7.9.1 | Apache-2.0 | Typed database client | Locked major |
| PostgreSQL | Final deployment version TBD | PostgreSQL License | Primary database | Planned |
| node-postgres (`pg`) | 8.22.0 | MIT | PostgreSQL driver/adapter | Planned if required |
| argon2 | 0.45.1 | MIT | Password hashing | Planned |
| Helmet | 8.3.0 | MIT | HTTP security headers | Planned |
| class-validator | 0.15.1 | MIT | NestJS request DTO validation | Planned |
| class-transformer | 0.5.1 | MIT | NestJS DTO transform | Planned |
| AWS SDK S3 Client | 3.1096.0 | Apache-2.0 | S3-compatible object storage | Planned |
| AWS SDK S3 Request Presigner | 3.1096.0 | Apache-2.0 | Presigned upload/download | Planned |
| openapi-typescript | 7.13.0 | MIT | Frontend API contract generation | Planned |
| Pino | 10.3.1 | MIT | Structured logging melalui adapter `packages/observability` | Locked for FND-008 |
| nestjs-pino | 4.6.1 | MIT | NestJS logging integration | Planned |

Sources:

- https://nestjs.com/
- https://www.prisma.io/
- https://www.postgresql.org/about/licence/
- https://node-postgres.com/
- https://github.com/ranisalt/node-argon2
- https://helmetjs.github.io/
- https://github.com/typestack/class-validator
- https://github.com/typestack/class-transformer
- https://github.com/aws/aws-sdk-js-v3
- https://openapi-ts.dev/
- https://getpino.io/

## 7. Planned Quality Dependencies

| Package/project | Versi teramati | License | Pemakaian | Status |
| --- | ---: | --- | --- | --- |
| Vitest | 4.1.10 | MIT | Unit/component tests; contracts for observability and content schema | Locked for FND-008 and CON-001 |
| Testing Library React | 16.3.2 | MIT | React behavior tests | Planned |
| Playwright Test | 1.62.0 | Apache-2.0 | Browser E2E | Planned |
| Supertest | 7.2.2 | MIT | HTTP integration tests | Planned |
| ESLint | 10.8.0 | MIT | Static analysis | Locked |
| Prettier | 3.9.6 | MIT | Formatting | Locked |

Sources:

- https://vitest.dev/
- https://testing-library.com/docs/react-testing-library/intro/
- https://playwright.dev/
- https://github.com/forwardemail/supertest
- https://eslint.org/
- https://prettier.io/

## 8. Evaluated or Conditional Visual Sources

| Project | License boundary | Decision |
| --- | --- | --- |
| Kokonut UI open repository | MIT | Reference/selective audited source only |
| Kokonut UI Pro/templates | Proprietary/commercial | Not approved |
| Bklit `packages/ui` and shadcn registry | MIT | Reference/selective audited source only |
| Bklit Studio | Proprietary | Prohibited |
| Anime.js | MIT | Deferred; only complex SVG/timeline requirement |
| Tiptap UI Components | License follows extension | Not approved until React 19 support stabilizes |
| Motion+ premium APIs/examples | Commercial | Not included; MIT core only |

Sources:

- https://github.com/kokonut-labs/kokonutui
- https://github.com/bklit/bklit-ui
- https://animejs.com/
- https://tiptap.dev/docs/ui-components/getting-started/overview
- https://motion.dev/

## 9. License Obligations

### MIT

Preserve applicable copyright and permission notices in distributed third-party notices or source copies.

### Apache-2.0

Preserve the license, applicable notices, attribution, and modification notices. Do not imply trademark rights.

### BSD-3-Clause

Preserve copyright, conditions, disclaimer, and non-endorsement clause.

### ISC

Preserve copyright and permission/disclaimer text.

### BlueOak-1.0.0

Distribusi salinan software harus menyertakan teks lisensi atau tautan lisensi
yang ditentukan. Baseline hanya mengizinkannya untuk dependency transitive
tooling yang sudah dicatat.

### PostgreSQL License

Preserve the applicable PostgreSQL copyright and permission notice.

### GNU AGPLv3 — MinIO Local-Development Exception

Preserve the MinIO copyright and GNU AGPLv3 license supplied with the image and
retain the upstream source reference for the exact release. ADR-008 approves
only unmodified local-development use. Distribution, modification, staging,
production, or hosted-service use requires a fresh engineering and legal
review.

### DOMPurify Dual License

The planned policy is to consume DOMPurify under its Apache-2.0 option and record that choice in generated notices. Confirm the distributed package license files at lock time.

## 10. Source-Copy Rules

For shadcn, Kokonut, Bklit MIT components, or any copied example:

1. Record source repository, commit/tag, path, and retrieval date.
2. Confirm the exact file belongs to the permissively licensed portion.
3. Preserve required notice/header.
4. Do not copy premium assets, Studio code, screenshots, fonts, or templates.
5. Run local formatting, lint, strict types, accessibility, and tests.
6. Replace weak external contracts with project-owned typed props.
7. Document material modifications.

Create a provenance entry before merge:

```text
Source:
Commit/tag:
Original path:
License:
Files copied:
Material modifications:
Reviewed by:
```

## 11. Release License Workflow

Before the first distributable release:

1. Install only approved dependencies.
2. Freeze `pnpm-lock.yaml`.
3. Export the complete production dependency/license inventory.
4. Inspect packages with missing, custom, dual, or copyleft licenses manually.
5. Generate `THIRD_PARTY_NOTICES.txt` containing required full notices.
6. Compare generated inventory with this register.
7. Review copied-source provenance.
8. Verify no prohibited package or asset enters browser/API images.
9. Archive the inventory with the release artifact.

Foundation exact-inventory gate:

```powershell
corepack pnpm run license:check
```

Release tetap memerlukan inventory production dan notice bundle terpisah.

## 12. Container Image Update Gate

Every PostgreSQL or MinIO image addition/update must:

1. Verify the official registry, source repository, release tag, and provenance.
2. Record a human-readable exact tag plus immutable multi-platform manifest
   digest.
3. Verify the project license, bundled/base-image notices, and the permitted
   environment.
4. Scan the exact digest for current advisories, distinguish total/fixable/
   suppressed findings, and obtain explicit risk disposition for unresolved
   critical/high findings.
5. Review PostgreSQL major/data-directory compatibility or MinIO data-format and
   S3 API compatibility as applicable.
6. Validate Compose config, loopback binding, healthchecks, query/HTTP smoke
   tests, and named-volume persistence across restart and recreate.
7. Run a clean bootstrap under a unique temporary Compose project with
   alternate loopback ports and new project-scoped volumes; remove only the
   verified temporary resources afterward.
8. Update this register, the applicable ADR, security triage, verification
   record, and rollback/upgrade evidence.

A tag/digest pin proves identity and reproducibility; it does not imply
security approval.

## 13. Change Control

Any dependency addition, removal, or version-major change must update:

- `pnpm-lock.yaml`;
- this register;
- package ownership documentation;
- relevant contract tests;
- ADR when the change alters architecture or license policy.

Security update urgency does not remove license and compatibility review; it changes its priority.
