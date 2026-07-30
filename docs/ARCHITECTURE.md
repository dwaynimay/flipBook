# System Architecture

## Interactive Digital Booklet Learning Platform

| Metadata | Nilai |
| --- | --- |
| Status | Approved Baseline |
| Tanggal persetujuan | 30 Juli 2026 |

## 1. Keputusan Arsitektur

Arsitektur MVP adalah modular monolith dalam satu pnpm monorepo.

Keputusan ini dipilih karena:

- lebih cepat dikembangkan dan diuji daripada microservices;
- transaksi publish, progress, quiz, dan adherence tetap sederhana;
- package reusable tetap memiliki boundary jelas;
- aplikasi web, admin, dan API dapat dibangun terpisah;
- scheduler atau worker dapat diekstrak ketika beban dan kebutuhan benar-benar muncul.

Kita tidak menggunakan NestJS native monorepo sebagai monorepo kedua. `apps/api` adalah satu workspace package NestJS mandiri di dalam pnpm workspace. Semua aplikasi dan package memiliki `package.json` sendiri.

## 2. Stack Terpilih

| Area | Pilihan | Alasan |
| --- | --- | --- |
| Package manager | pnpm 11 | Workspace native, instalasi efisien, protokol `workspace:` |
| Task orchestration | Turborepo 2 | Task graph, cache build/test, konfigurasi ringan |
| Bahasa | TypeScript strict | Kontrak lintas app/package dan schema aman |
| Learner web | React 19 + Vite | Cepat untuk SPA interaktif dan deployment statis |
| Admin web | React 19 + Vite | Stack sama, komponen dan tooling dapat dibagi |
| Routing | React Router | Routing SPA sederhana |
| Server state | TanStack Query | Cache, mutation, invalidation, retry |
| Form | React Hook Form | Form admin yang besar tetap ringan |
| Validation | Zod | Schema runtime dan TypeScript inference |
| Styling | Tailwind CSS + design tokens | Iterasi UI cepat dan konsisten |
| API | NestJS 11 | Modular, DI, validation, OpenAPI, guard/interceptor |
| HTTP adapter | Express untuk MVP | Integrasi dan dokumentasi paling sederhana |
| Database | PostgreSQL | Relasional, transaksi, JSONB, indexing |
| ORM | Prisma 7 | Schema, migration, typed client |
| Object storage | MinIO lokal; S3-compatible production | API storage konsisten antar-environment |
| Auth | Email/password + session refresh cookie | Sederhana dan aman untuk MVP |
| Flip engine | Adapter di atas `react-pageflip`/StPageFlip | Efek realistis tanpa mengikat domain ke library |
| Testing | Vitest, Testing Library, Supertest, Playwright | Unit, integration, dan end-to-end |
| API contract | OpenAPI dari NestJS | Dokumentasi dan client generation |
| Local infrastructure | Docker Compose | PostgreSQL dan MinIO reproducible |

Versi dependency harus dikunci oleh lockfile dan diperbarui melalui PR terpisah. Jangan menggunakan tag `latest` di `package.json`.

## 3. Struktur Monorepo

```text
interactive-digital-booklet/
├─ apps/
│  ├─ web/                    # learner application
│  ├─ admin/                  # content management application
│  └─ api/                    # NestJS modular monolith
├─ packages/
│  ├─ api-contracts/          # generated client/types from OpenAPI
│  ├─ content-schema/         # versioned JSON schema + migrators
│  ├─ block-renderer/         # JSON blocks → safe React DOM
│  ├─ block-editor/           # admin editing UI
│  ├─ flipbook-engine/        # adapter around page-flip library
│  ├─ quiz-engine/            # reusable quiz UI/evaluation contracts
│  ├─ ui/                     # shared primitives and design tokens
│  ├─ database/               # Prisma schema, migrations, generated client
│  ├─ observability/          # logger/error helpers
│  ├─ config-eslint/
│  └─ config-typescript/
├─ tooling/
│  └─ scripts/                # repository automation only
├─ docs/
│  ├─ PRD.md
│  ├─ ARCHITECTURE.md
│  ├─ MONOREPO-BOOTSTRAP.md
│  ├─ ERD.md                  # next phase
│  └─ API.md                  # next phase
├─ .github/
│  └─ workflows/
├─ package.json
├─ pnpm-workspace.yaml
├─ turbo.json
└─ tsconfig.base.json
```

## 4. Aturan Boundary

### Dependency Direction

```text
apps/web ─────┬─> api-contracts
              ├─> block-renderer ─> content-schema
              ├─> flipbook-engine ─> block-renderer
              ├─> quiz-engine
              └─> ui

apps/admin ───┬─> api-contracts
              ├─> block-editor ────> content-schema
              ├─> block-renderer
              └─> ui

apps/api ─────┬─> database
              ├─> content-schema
              ├─> observability
              └─> framework modules internal to apps/api
```

Aturan wajib:

- `packages/*` tidak boleh mengimpor dari `apps/*`.
- `content-schema` tidak bergantung pada React, NestJS, Prisma, atau browser API.
- `block-renderer` tidak mengimpor `block-editor`.
- `flipbook-engine` tidak mengetahui Prisma model atau API DTO.
- `ui` tidak memiliki business rule booklet, quiz, atau reminder.
- frontend tidak mengimpor Prisma Client.
- app tidak melakukan deep import ke `src` package lain; hanya public exports.
- dependency internal memakai `workspace:*`.
- business module baru tetap di `apps/api/src/modules` sampai terbukti reusable.

## 5. Modul Backend

```text
apps/api/src/modules/
├─ auth/
├─ users/
├─ booklets/
├─ publishing/
├─ media/
├─ learning-materials/
├─ myth-facts/
├─ quizzes/
├─ progress/
├─ reminders/
├─ adherence/
└─ analytics/
```

Setiap modul memiliki controller, application service, domain policy, dan repository adapter yang diperlukan. Hindari abstraksi repository generik. Prisma boleh digunakan di infrastructure layer modul melalui package `database`.

Scheduler reminder pada MVP berjalan sebagai module di API. Ekstrak menjadi `apps/worker` hanya jika:

- job membutuhkan retry/delivery terdistribusi;
- proses mengganggu latency API;
- deployment perlu scaling independen;
- web push atau kanal eksternal menjadi scope.

## 6. Publishing Model

Draft dan published content harus dipisahkan.

```text
Booklet
  ├─ currentDraftRevisionId
  └─ publishedRevisionId

BookletRevision
  ├─ DRAFT (mutable)
  └─ PUBLISHED (immutable snapshot)
```

Alur publish:

1. Muat seluruh draft revision.
2. Validasi content schema.
3. Validasi media reference dan quiz trigger.
4. Validasi urutan chapter/page.
5. Jalankan overflow/preflight checks.
6. Dalam transaksi, buat snapshot published dan ubah pointer booklet.
7. Emit audit/analytics event setelah commit.

Progress selalu terikat pada `revisionId`. Ini mencegah persentase dan posisi baca berubah secara tidak terduga ketika admin menerbitkan konten baru.

## 7. Integrasi Block Editor dan Flipbook

### 7.1 Pipeline yang Benar

```text
Editor State
   ↓ validate
Versioned Page JSON
   ↓ migrate to current schema
Block Renderer
   ↓ stable page DOM
Flipbook Adapter
   ↓
react-pageflip / StPageFlip
```

Editor tidak boleh merender langsung ke `HTMLFlipBook`. Reader juga tidak boleh menafsirkan JSON secara ad-hoc.

### 7.2 Tantangan Teknis

#### DOM Ref dan React 19

`react-pageflip` 2.0.3 menggunakan `React.cloneElement` untuk menyuntikkan ref ke setiap child dan masih membangun wrapper dengan `forwardRef`. React 19 masih mendukung pola tersebut, tetapi `ref` kini diperlakukan sebagai prop dan tipe ref lebih ketat.

Mitigasi:

- setiap page menggunakan komponen adapter yang meneruskan ref ke satu root `HTMLElement`;
- tidak memakai Fragment sebagai child langsung;
- buat contract test khusus React 19;
- semua akses imperative disembunyikan di `flipbook-engine`;
- jangan biarkan app memanggil API library secara langsung.

#### Dynamic Page Update

Library memperbarui halaman ketika children berubah dan memanggil `updateFromHtml`. Autosave editor dapat menyebabkan update berulang, kehilangan posisi, atau reinitialization.

Mitigasi:

- editor preview tidak memakai engine flip untuk setiap keystroke;
- preview flip memakai snapshot/debounce eksplisit;
- reader hanya menerima published revision immutable;
- page key berasal dari `pageId`, bukan array index;
- adapter menangkap current `pageId` sebelum update dan memulihkannya setelah update.

#### Fixed Page Geometry dan Overflow

Flip engine bekerja paling stabil ketika setiap halaman memiliki ukuran DOM yang terprediksi, sedangkan block JSON memiliki tinggi dinamis.

Mitigasi MVP:

- gunakan page preset portrait dengan rasio tetap;
- sediakan safe content area dan design tokens;
- blok media wajib memiliki aspect ratio;
- admin preview pada desktop dan mobile;
- publish blocker untuk overflow keras;
- konten tidak dipaginasi otomatis pada MVP;
- tampilkan instruksi memecah page jika overflow.

#### Interactive Child vs Gesture

Klik, drag, swipe, video control, link, dan quiz dapat berbenturan dengan gesture flip.

Mitigasi:

- tandai interactive region dengan data attribute;
- hentikan gesture flip pada control interaktif;
- aktifkan forwarding click event yang sesuai;
- sediakan tombol next/previous eksplisit;
- uji pointer, touch, dan keyboard secara terpisah.

#### Portrait/Landscape Mapping

Pada landscape, satu spread dapat menampilkan dua page; pada portrait hanya satu. Indeks visual tidak selalu sama dengan page logis.

Mitigasi:

- progress disimpan dengan `pageId`;
- indeks library hanya detail adapter;
- perubahan orientation memetakan kembali ke page logis;
- cover dan page ganjil/genap diuji sebagai kasus khusus.

#### Performance

Library membutuhkan elemen halaman untuk membangun book. Virtualisasi agresif dapat merusak perhitungan page.

Mitigasi:

- semua shell page tetap ada untuk booklet MVP;
- lazy-load isi media, bukan menghapus page DOM;
- image memakai responsive source dan decoding async;
- batasi booklet MVP;
- prefetch metadata dan thumbnail, bukan video penuh.

#### Accessibility

Efek flip bukan representasi dokumen yang ideal untuk screen reader atau pengguna reduced-motion.

Mitigasi:

- source of truth tetap JSON semantic;
- sediakan vertical reading mode;
- urutan heading dan reading order konsisten;
- kontrol flip memiliki label dan keyboard support;
- mode vertical menjadi fallback error.

### 7.3 Exit Strategy Library

`flipbook-engine` harus menyediakan interface internal:

```text
FlipbookController
  goTo(pageId)
  next()
  previous()
  getCurrentPageId()
  setMode("flip" | "vertical")
  subscribe(event)
  destroy()
```

Interface ini memungkinkan `react-pageflip` diganti dengan StPageFlip langsung atau engine lain tanpa mengubah app dan schema konten.

## 8. Content Schema Strategy

`packages/content-schema` memuat:

- Zod schema setiap block;
- discriminated union block;
- `PageDocument` schema;
- migrator schema document;
- migrator per block;
- sanitizer policy;
- type guards;
- fixtures contract test.

Prinsip:

- JSON adalah data, bukan executable configuration;
- tidak menyimpan React component name;
- tidak menyimpan arbitrary CSS;
- referensi eksternal menggunakan ID/allowlisted URL;
- schema server adalah otoritas terakhir;
- backward compatibility reader minimal dua versi schema;
- migrasi destructive membutuhkan publish revision baru.

## 9. Data dan Prisma

Prisma ditempatkan di `packages/database`, mencakup:

- `prisma/schema.prisma`;
- `prisma.config.ts`;
- migrations;
- seed development;
- generated client output;
- public export yang terbatas.

Gunakan kolom relasional untuk data yang dicari, difilter, atau dijaga integritasnya. Gunakan JSONB hanya untuk document block content dan metadata fleksibel.

Index minimum:

- published booklet by status/category;
- chapter/page by revision and order;
- progress by user/revision/page;
- quiz attempt by user/quiz/revision;
- adherence by user/schedule/localDate;
- analytics event by type/timestamp.

## 10. API Design

- REST JSON dengan prefix `/api/v1`.
- OpenAPI dihasilkan dari NestJS.
- DTO request divalidasi.
- Error memakai envelope konsisten dan machine-readable code.
- Pagination cursor untuk list yang berpotensi besar.
- Mutation penting menerima idempotency/deduplication key bila diperlukan.
- Upload file menggunakan presigned URL; API menyimpan metadata setelah upload selesai.
- API contract frontend dihasilkan, bukan diketik ulang manual.

## 11. Auth dan Security

- access token berumur pendek;
- refresh session di cookie HttpOnly;
- refresh token dirotasi dan hash-nya disimpan;
- CSRF protection diterapkan sesuai strategi cookie;
- RBAC: `ADMIN`, `EDITOR`, `LEARNER`;
- Argon2id untuk password;
- login rate limit dan lockout bertahap;
- audit log untuk login admin, publish, unpublish, dan delete;
- media private menggunakan signed URL;
- Content Security Policy membatasi embed dan script.

## 12. Reminder Architecture

MVP:

- schedule disimpan di server dalam timezone IANA;
- web menghitung next occurrence untuk UI;
- Notification API hanya dipanggil setelah permission eksplisit;
- ketika app aktif, local timer/in-app notification dapat memunculkan reminder;
- adherence dicatat ke server;
- dashboard menampilkan reminder yang jatuh tempo.

Di luar MVP:

- service worker push;
- VAPID subscription;
- queue dan retry;
- delivery receipt;
- WhatsApp/email/SMS.

Keterbatasan ini harus terlihat di produk. Notification API biasa tidak menjamin delivery ketika browser ditutup.

## 13. Testing Strategy

### Unit

- content schema dan migrator;
- progress calculation;
- adherence calculation;
- quiz scoring;
- authorization policy;
- flip page mapping.

### Component

- setiap block renderer;
- block editor controls;
- quiz dialog;
- reminder permission states;
- flip adapter dengan mocked engine.

### Integration

- Prisma repository dengan PostgreSQL test;
- publish transaction;
- auth rotation;
- quiz submission;
- idempotent progress event.

### End-to-End

- admin membuat → preview → publish booklet;
- learner membaca → video → quiz → complete;
- reminder → adherence log → calendar;
- mobile portrait dan desktop landscape;
- vertical accessible reader.

### Contract

- React 19 + `react-pageflip`;
- OpenAPI generated client;
- content fixtures lama terhadap migrator baru.

## 14. Quality Gates

Setiap pull request wajib:

- install dengan frozen lockfile;
- lint;
- format check;
- typecheck;
- unit test;
- build package/app yang terdampak;
- integration test untuk perubahan API/database;
- tidak menambah circular dependency;
- tidak mengubah published schema tanpa migrator.

## 15. Deployment Awal

```text
CDN/static host
  ├─ apps/web
  └─ apps/admin

Application host
  └─ apps/api

Managed services
  ├─ PostgreSQL
  └─ S3-compatible object storage
```

Deployment pertama tidak memerlukan Kubernetes. Docker image untuk API dan static assets/CDN untuk frontend sudah cukup.

## 16. Architecture Decision Records yang Perlu Dibuat

- ADR-001: pnpm workspace + Turborepo
- ADR-002: modular monolith
- ADR-003: versioned JSON content schema
- ADR-004: immutable published revision
- ADR-005: flipbook adapter dan vertical fallback
- ADR-006: cookie-based refresh session
- ADR-007: reminder MVP limitation
- ADR-008: MinIO local dan S3-compatible production
