# Technical Analysis & Impeccable Ecosystem Matching

## Interactive Digital Booklet Learning Platform

| Metadata | Nilai |
| --- | --- |
| Status | Approved Baseline |
| Tanggal verifikasi | 28 Juli 2026 |
| Tanggal persetujuan | 30 Juli 2026 |
| Baseline | React 19.2, NestJS 11, Prisma 7, PostgreSQL |
| Prinsip | Type-safe, modular, accessible, measurable, legally traceable |

## 1. Executive Decision

Fondasi yang direkomendasikan adalah modular monolith dalam pnpm monorepo:

```text
apps/web       React learner application
apps/admin     React content management application
apps/api       NestJS modular monolith

packages/content-schema
packages/block-renderer
packages/block-editor
packages/flipbook-engine
packages/quiz-engine
packages/ui
packages/database
packages/api-contracts
packages/observability
```

Stack UI produksi:

- React 19 + Vite;
- Tailwind CSS;
- shadcn/ui source components dengan Radix primitives;
- Motion melalui `motion/react`;
- Recharts melalui wrapper internal;
- `@daypicker/react` untuk kalender;
- TanStack Query dan TanStack Table;
- React Hook Form;
- Zod untuk document schema dan form schema frontend;
- dnd-kit stable packages untuk reorder block;
- Tiptap headless core untuk rich text terbatas;
- Uppy headless hooks untuk upload;
- StPageFlip melalui package `page-flip` di balik adapter internal.

Impeccable bukan klaim bahwa software bebas bug. Impeccable adalah proses yang membuat cacat sulit masuk dan mudah terdeteksi: dependency gate, strict types, schema runtime, accessibility contract, performance budget, contract tests, dan release evidence.

## 2. Find Skill Result

Proses pencarian agent skill dilakukan sebelum memilih library.

### Kandidat Bereputasi Tinggi

| Skill | Indikator saat diperiksa | Pengaruh pada blueprint | Keputusan |
| --- | ---: | --- | --- |
| `vercel-labs/agent-skills@vercel-react-best-practices` | ±583 ribu instalasi | React rendering, data flow, bundle discipline | Direkomendasikan bila PO meminta instalasi |
| `vercel-labs/agent-skills@web-design-guidelines` | ±493 ribu instalasi | Accessibility dan web UI review | Direkomendasikan bila PO meminta instalasi |
| `shadcn/ui@shadcn` | ±253 ribu instalasi | Component ownership dan composition | Direkomendasikan bila workflow generator dimulai |
| `pbakaus/impeccable@impeccable` | ±208 ribu instalasi | Visual quality/polish review | Direkomendasikan untuk fase visual QA |

### Kandidat yang Ditolak

Hasil CLI dengan nama “impeccable” dari sumber tidak dikenal dan hanya 5–45 instalasi tidak direkomendasikan. Nama skill bukan bukti mutu. Tidak ada skill yang dipasang pada fase ini karena Product Owner baru meminta evaluasi.

Sumber leaderboard: https://www.skills.sh/

## 3. Dependency Acceptance Gate

Library hanya boleh diadopsi jika seluruh gate berikut lulus:

1. Lisensi teridentifikasi dan diizinkan.
2. Package/repository resmi dapat dibuktikan.
3. React peer dependency mencakup React 19 atau contract spike membuktikan kompatibilitas.
4. TypeScript declarations tersedia dan tidak memaksa `any` pada public contract kita.
5. Tidak menduplikasi kemampuan platform/library yang sudah dipilih.
6. Bundle, runtime cost, dan lifecycle cleanup dapat diukur.
7. Keyboard, focus, reduced motion, dan screen-reader path dapat diuji.
8. Library dibungkus hanya jika ada alasan isolasi, normalisasi, atau exit strategy.
9. Dependency baru memiliki owner package yang jelas.
10. `THIRD_PARTY_LICENSES.md` diperbarui sebelum merge.

Status keputusan:

- **ADOPT** — dapat menjadi dependency baseline.
- **ADOPT WITH WRAPPER** — dipakai hanya melalui public contract internal.
- **CONDITIONAL** — perlu spike atau audit source sebelum dipakai.
- **DEFER** — baik, tetapi belum diperlukan MVP.
- **REJECT** — risiko atau overlap lebih besar daripada manfaat.

## 4. React 19 Compatibility Snapshot

Metadata registry diperiksa pada 28 Juli 2026.

| Package | Versi teramati | React peer contract | Status |
| --- | ---: | --- | --- |
| `motion` | 12.42.2 | React 18 atau 19 | ADOPT |
| `recharts` | 3.10.1 | Mencakup React 19 | ADOPT WITH WRAPPER |
| `@daypicker/react` | 10.0.1 | React ≥16.8 | ADOPT WITH WRAPPER |
| `@tiptap/react` | 3.29.1 | React 17, 18, atau 19 | ADOPT, headless core only |
| `@uppy/react` | 5.2.0 | React 18 atau 19 | ADOPT, headless hooks |
| `sonner` | 2.0.7 | React 18 atau 19 | ADOPT |
| `cmdk` | 1.1.1 | React 18 atau 19 | ADOPT |
| `@dnd-kit/core` | 6.3.1 | React ≥16.8 | ADOPT WITH TESTS |
| `react-pageflip` | 2.0.3 | Tidak dideklarasikan | CONDITIONAL, tidak dikunci |
| `page-flip` | 2.0.7 | Bukan React package | ADOPT WITH REACT ADAPTER |

Catatan:

- Tidak adanya konflik peer dependency bukan bukti runtime compatibility.
- `react-pageflip` memakai pola clone child dan injected ref yang perlu contract test React 19.
- Tiptap core mendukung React 19 berdasarkan peer contract, tetapi Tiptap UI Components masih memiliki peringatan kompatibilitas. Karena itu kita memakai headless core dan kontrol UI milik sendiri.
- React memoization adalah optimasi, bukan jaminan semantik. `memo`, `useMemo`, dan `useCallback` hanya digunakan jika referential stability atau profiling membuktikan manfaat.

## 5. Cross-Cutting Foundation

| Concern | Pilihan | Keputusan teknis |
| --- | --- | --- |
| Workspace | pnpm + Turborepo | Satu lockfile, dependency internal `workspace:*`, cached task graph |
| Client routing | React Router | Route-level lazy loading, typed route helpers milik app |
| Server state | TanStack Query | Tidak ada fetch ad-hoc di component |
| Tables | TanStack Table | Headless, typed columns, cocok untuk admin |
| Forms | React Hook Form + Zod | Controlled boundary, schema-driven validation |
| UI primitives | shadcn/ui + Radix | Source-owned components; accessibility tetap diuji |
| Styling | Tailwind + CSS variables/design tokens | Tidak ada magic color dan arbitrary visual drift |
| Stateful motion | Motion | `AnimatePresence`, `LazyMotion`, reduced-motion policy |
| API | NestJS REST + OpenAPI | Generated contract untuk frontend |
| Database | Prisma + PostgreSQL | Relational data; JSONB hanya untuk page document |
| Upload | Uppy headless + S3 presigned URL | Upload langsung, typed metadata, progress/retry |
| Logging | Pino + nestjs-pino | Structured logs dan correlation ID |
| Test | Vitest + Testing Library + Playwright + Supertest | Unit, component, integration, E2E |

## 6. Module 1–17 Ecosystem Matching

### Module 1 — Authentication

**Selected**

- NestJS Guards, Passport integration, `@nestjs/jwt`;
- Argon2id melalui `argon2`;
- React Hook Form + Zod untuk login form;
- shadcn Form/Input dan Radix primitives;
- `@nestjs/throttler` untuk rate limiting.

**Impeccable contract**

- refresh session hanya melalui cookie `HttpOnly`;
- token tidak disimpan di `localStorage`;
- role adalah union/enum tertutup;
- request DTO divalidasi pada server;
- auth state tidak diduplikasi di banyak store;
- login, refresh, logout, dan reuse detection memiliki integration tests.

**Rejected**

- custom crypto;
- parsing JWT manual;
- auth logic di React component;
- Firebase/Auth0 untuk MVP karena menambah vendor boundary tanpa kebutuhan.

### Module 2 — Dashboard

**Selected**

- shadcn layout primitives;
- Recharts melalui `packages/ui/charts`;
- TanStack Query;
- Motion hanya untuk mount/exit dan perubahan state yang bermakna.

**Impeccable contract**

- chart menerima typed series/config;
- tooltip, axis, legend, empty state, dan screen-reader summary wajib tersedia;
- data aggregation dilakukan server/database, bukan di browser;
- chart module lazy-loaded jika tidak berada above the fold.

**Bklit UI decision**

Bklit UI chart components berlisensi MIT, tetapi Bklit Studio proprietary dan repository belum memiliki release formal saat diperiksa. Bklit tidak menjadi runtime dependency. Komponen MIT boleh menjadi referensi desain atau di-vendor setelah source audit dan provenance dicatat. Baseline tetap Recharts.

### Module 3 — Booklet

**Selected**

- TanStack Table untuk daftar admin;
- React Hook Form + Zod untuk metadata;
- Uppy headless untuk cover/thumbnail;
- TanStack Query mutations;
- NestJS + Prisma transaction.

**Impeccable contract**

- `BookletId`, `RevisionId`, dan status tidak memakai string liar;
- publish bukan update boolean sederhana, tetapi application command tervalidasi;
- optimistic update hanya untuk field aman, bukan publish/delete;
- cover memiliki aspect-ratio policy dan alt text.

### Module 4 — Chapter

**Selected**

- dnd-kit core + sortable untuk reorder;
- Zod untuk ordered chapter/page schema;
- Prisma unique/index constraint untuk revision dan order.

**Impeccable contract**

- drag handle berupa button semantic;
- keyboard sensor, instruction, live announcement, dan escape cancel wajib;
- urutan tidak diubah dengan banyak request kecil; kirim satu typed reorder command;
- ID stabil, tidak menggunakan array index sebagai React key.

### Module 5 — Interactive Page / Block Editor

**Selected**

- `packages/content-schema` dengan Zod discriminated union;
- dnd-kit untuk outer block ordering;
- Tiptap headless core + MIT core extensions untuk rich text terbatas;
- DOMPurify pada render HTML yang memang diperlukan;
- Uppy untuk media;
- block registry internal, bukan dynamic component name dari JSON.

**Impeccable contract**

- setiap block memiliki `id`, `type`, `version`, dan typed `props`;
- unknown data masuk sebagai `unknown`, lalu diparse;
- tidak ada arbitrary JavaScript atau arbitrary CSS dalam JSON;
- autosave memakai cancellable/debounced command, bukan interval acak;
- undo/redo adalah editor command history;
- overflow page adalah publish blocker;
- Tiptap UI Components tidak digunakan sampai dukungan React 19 dinyatakan stabil.

### Module 6 — Flipbook Viewer

**Selected**

- `page-flip`/StPageFlip melalui `packages/flipbook-engine`;
- block renderer menghasilkan stable DOM;
- Motion hanya untuk toolbar/dialog, bukan menggantikan page physics;
- vertical semantic reader sebagai fallback.

**Mengapa bukan langsung `react-pageflip`**

Wrapper publik saat ini tidak mendeklarasikan React peer dependency dan menggunakan injected ref/clone child. Mengikat app langsung ke wrapper tersebut membuat upgrade React dan lifecycle sulit dikendalikan.

**Impeccable contract**

- internal `FlipbookController` memakai `pageId`, bukan index;
- adapter mengurus create/update/destroy dan event cleanup;
- published pages immutable selama reading session;
- video/button/quiz region tidak meneruskan gesture flip;
- portrait/landscape mapping memiliki contract test;
- `prefers-reduced-motion` dan vertical mode tersedia;
- spike harus lulus StrictMode double-mount, resize, orientation, keyboard, touch, dan 60-page test.

`react-pageflip` dapat dipertimbangkan kembali hanya jika spike membuktikan ia mengurangi kode tanpa melemahkan lifecycle contract.

### Module 7 — Video Edukasi

**Selected**

- native `<video>` untuk file;
- privacy-enhanced YouTube embed melalui wrapper internal;
- Uppy + S3-compatible presigned upload;
- TanStack Query untuk metadata/progress.

**Impeccable contract**

- tidak autoplay dengan suara;
- progress di-throttle berdasarkan milestone, bukan event setiap frame;
- URL provider di-allowlist;
- caption/transcript field disiapkan;
- player cleanup dan fullscreen diuji;
- HLS.js ditunda sampai adaptive streaming benar-benar dibutuhkan.

### Module 8 — Materi Edukasi

**Selected**

- content schema + block renderer;
- Tiptap headless untuk authoring;
- Uppy untuk image/PDF;
- responsive image primitives.

**Impeccable contract**

- satu renderer dipakai preview dan reader;
- sanitized rich text;
- image dimensions/aspect ratio tersimpan;
- PDF bukan default reading path dan selalu memiliki alternatif ringkas/unduhan.

### Module 9 — Mitos vs Fakta

**Selected**

- shadcn Card;
- Radix Collapsible atau controlled disclosure;
- Motion `AnimatePresence` untuk reveal/flip state.

**Impeccable contract**

- state machine sederhana dan typed;
- tidak menggunakan random `setTimeout`;
- label tidak hanya mengandalkan warna;
- height animation tidak menyebabkan layout jump;
- reduced-motion mengganti flip 3D menjadi fade singkat/non-motion.

### Module 10 — Reminder Minum TTD

**Selected**

- `@nestjs/schedule` untuk due-schedule scan MVP;
- `rrule` untuk recurrence;
- date-fns dan timezone helper;
- browser Notification API;
- Sonner untuk in-app feedback.

**Impeccable contract**

- recurrence tidak dihitung dengan algoritma kalender buatan sendiri;
- timezone memakai IANA identifier;
- satu occurrence memiliki deduplication key;
- no random client `setTimeout` sebagai sumber kebenaran;
- notification permission diminta setelah user gesture;
- delivery saat browser tertutup tidak dijanjikan pada MVP.

**Future**

- `web-push`, queue, retry, dan worker terpisah hanya ketika background delivery masuk scope.

### Module 11 — Kalender TTD

**Selected**

- `@daypicker/react` v10;
- date-fns;
- shadcn Calendar wrapper milik `packages/ui`.

**Impeccable contract**

- semua status tanggal berasal dari typed domain data;
- perhitungan memakai timezone learner;
- keyboard navigation dan accessible labels diuji;
- locale Bahasa Indonesia eksplisit;
- tidak membuat algoritma Gregorian, leap-year, atau month grid sendiri.

### Module 12 — Quiz

**Selected**

- `packages/quiz-engine`;
- React Hook Form + Zod;
- Radix Dialog;
- Motion `AnimatePresence`;
- server-side scoring.

**Impeccable contract**

- question union dibedakan berdasarkan `type`;
- answer payload tidak memakai loose object;
- popup hanya dibuka setelah flip state `read`;
- dialog mengelola focus trap dan focus restore;
- score client hanya preview; server adalah authority;
- attempt submission idempotent;
- animation state tidak menentukan business state.

### Module 13 — Progress Learning

**Selected**

- Radix/shadcn Progress;
- TanStack Query;
- Recharts untuk trend/ringkasan;
- PostgreSQL upsert dan unique constraints.

**Impeccable contract**

- progress terikat `revisionId` + `pageId`;
- event memiliki idempotency key;
- persentase dihitung dari definisi domain tunggal;
- UI optimistic hanya jika monotonic update aman;
- tidak menyimpan derived percentage sebagai state terpisah di banyak component.

### Module 14 — Analytics

**Selected**

- PostgreSQL aggregate/materialized view jika diperlukan;
- NestJS typed analytics query;
- Recharts wrapper;
- OpenTelemetry ditunda sampai infrastructure phase.

**Impeccable contract**

- definisi metrik terdokumentasi;
- raw health data tidak masuk dashboard umum;
- chart tidak mengagregasi jutaan event di client;
- range dan timezone eksplisit;
- empty/partial/error state diuji.

**Bklit UI**

Tidak menjadi foundation. Hanya komponen MIT yang telah diaudit boleh diadaptasi, tanpa kode Bklit Studio.

### Module 15 — Search

**Selected**

- PostgreSQL full-text search;
- `pg_trgm` untuk typo-tolerant title/tag search;
- cmdk untuk command/search presentation;
- TanStack Query dengan cancellation/debounce.

**Impeccable contract**

- ranking dilakukan server;
- query minimum dan result limit eksplisit;
- request lama dibatalkan;
- snippet di-escape/sanitize;
- Meilisearch/Elasticsearch ditunda sampai PostgreSQL terbukti tidak cukup.

### Module 16 — Notification

**Selected**

- Sonner untuk toast transient;
- Radix Alert Dialog untuk confirmation;
- browser Notification API untuk reminder aktif;
- persisted notification records di PostgreSQL.

**Impeccable contract**

- toast tidak dipakai untuk error yang membutuhkan tindakan lama;
- permission state typed;
- no duplicate toast dari rerender/effect;
- user dapat membaca notification history;
- web push adalah roadmap terpisah.

### Module 17 — Admin Panel

**Selected**

- shadcn/ui + Radix;
- TanStack Table;
- React Hook Form + Zod;
- Uppy headless;
- Motion;
- TanStack Query;
- React Router.

**Kokonut UI decision**

Open-source component repository Kokonut UI berlisensi MIT dan dapat membantu visual ide. Ia bukan design-system authority. Komponen hanya boleh disalin setelah:

- license/provenance dicatat;
- dependency dan React 19 assumptions diperiksa;
- `any`, unnecessary effects, hard-coded colors, dan Next-only coupling dibuang;
- accessibility diuji;
- hasil dipindahkan ke public API `packages/ui`.

Kokonut UI Pro/templates berbayar tidak termasuk approval.

## 7. Animation Decision Matrix

| Kebutuhan | Pilihan | Larangan |
| --- | --- | --- |
| Dialog/menu enter-exit | Motion `AnimatePresence` | `setTimeout` untuk menunggu animasi |
| Layout reorder feedback | Motion layout atau dnd-kit transform | Mengubah DOM position manual |
| Myth/fact reveal | Motion variants | Class toggle tersebar tanpa state contract |
| Quiz popup | Radix Dialog + Motion | Modal buatan sendiri tanpa focus management |
| Page flip | StPageFlip | Simulasi page curl CSS buatan sendiri |
| Simple hover/focus | CSS/Tailwind | Motion untuk setiap hover kecil |
| Complex SVG learning timeline | Anime.js, conditional | Memasang Anime.js sebelum use case disetujui |

Gunakan `LazyMotion` dengan fitur terkecil yang memenuhi kebutuhan dan global reduced-motion policy.

## 8. Performance Standard

### React

- state disimpan sedekat mungkin dengan consumer;
- derived value dihitung saat render jika murah;
- `useEffect` hanya untuk sinkronisasi external system;
- `memo`, `useMemo`, dan `useCallback` memerlukan alasan referential stability atau bukti profiler;
- callback tidak dimemoisasi secara ritual;
- query selectors mencegah rerender akibat data yang tidak dipakai;
- route dan feature berat di-lazy-load;
- animation tidak memodifikasi layout property mahal bila transform/opacity cukup.

### Media dan Reader

- image responsive, lazy, dan memiliki intrinsic dimensions;
- video tidak diprefetch penuh;
- flipbook menjaga page shell tetapi me-lazy-load media;
- long task dan animation frame drop diuji pada perangkat kelas menengah;
- 60-page reference booklet menjadi performance fixture.

### Budget Awal

- initial learner JS gzip target ≤ 250 KB di luar route reader/editor;
- reader-specific chunk target ≤ 180 KB gzip di luar media;
- admin editor dipisahkan dari learner bundle;
- LCP target ≤ 2,5 detik p75;
- INP target ≤ 200 ms p75;
- zero unexpected layout shift untuk page shell.

Budget dapat diubah hanya melalui ADR dengan hasil pengukuran.

## 9. Type-Safety Standard

- `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, dan `noImplicitOverride`;
- `any`, `as any`, implicit `any`, dan blanket TypeScript suppression dilarang;
- external input adalah `unknown`;
- parse di boundary lalu gunakan typed value;
- branded/opaque ID atau validated ID type untuk entity kritis;
- discriminated union untuk block, question, notification, dan analytics event;
- exhaustive switch memakai `never`;
- DTO API dihasilkan/diparse; tidak diduplikasi manual;
- no non-null assertion kecuali invariant lokal dibuktikan dan diuji;
- third-party weak types tidak boleh bocor dari adapter.

## 10. Reusability Standard

Package dibuat berdasarkan ownership dan dependency direction, bukan sekadar untuk mengejar jumlah package.

Package reusable wajib:

- memiliki satu alasan berubah;
- public exports eksplisit;
- tidak mengimpor dari `apps/*`;
- tidak melakukan deep import ke package lain;
- memiliki typed props/commands/events;
- tidak mengambil singleton app secara tersembunyi;
- memiliki contract tests;
- memiliki README singkat hanya jika public API tidak self-evident.

`packages/ui` hanya memuat design primitives. Business component booklet tetap berada di feature package/app yang memiliki domain tersebut.

## 11. Quality Verification Before Dependency Lock

### Spike A — Flip Engine

- React 19 StrictMode mount/unmount;
- ref lifecycle;
- 60 pages;
- resize dan orientation;
- interactive video/button;
- keyboard/touch;
- reduced motion;
- memory cleanup.

### Spike B — Editor

- typed block registry;
- 100 blocks reorder;
- keyboard drag/drop;
- autosave cancellation;
- undo/redo;
- overflow detection;
- Tiptap JSON sanitization.

### Spike C — Calendar/Reminder

- timezone Asia/Bangkok dan Asia/Jakarta;
- DST timezone test walaupun target awal non-DST;
- recurrence deduplication;
- denied notification permission;
- late/missed occurrence.

### Spike D — Upload

- Uppy headless hooks;
- typed metadata/response;
- presigned URL;
- abort/retry;
- file size/MIME rejection;
- orphan object cleanup.

### Spike E — Visual System

- shadcn/Radix focus behavior;
- Motion reduced motion;
- chart keyboard/text summary;
- contrast;
- mobile 360 px;
- dark mode token parity.

Tidak ada library critical yang dinyatakan “locked” sebelum spike terkait lulus.

## 12. Explicit Rejections

- raw `react-pageflip` import dari app;
- Bklit Studio atau proprietary source;
- Kokonut UI Pro tanpa lisensi;
- Tiptap UI Components sebelum React 19 support stabil;
- CSS/setTimeout animation orchestration;
- handmade chart, calendar grid, recurrence, crypto, rich-text parser, atau focus trap;
- Moment.js untuk date handling baru;
- Redux/global store tanpa kebutuhan lintas-feature yang terbukti;
- microservices, Kafka, Kubernetes, atau Elasticsearch pada MVP;
- dependency yang hanya menghemat kurang dari ±30 baris tetapi menambah lifecycle/security surface;
- UI yang terlihat premium tetapi gagal keyboard, reduced motion, atau loading/error state.

## 13. Primary References

- React performance guidance: https://react.dev/reference/react/memo
- React effects guidance: https://react.dev/learn/you-might-not-need-an-effect
- Motion: https://motion.dev/
- shadcn/ui: https://ui.shadcn.com/
- Recharts: https://recharts.github.io/
- React DayPicker: https://daypicker.dev/
- dnd-kit accessibility: https://docs.dndkit.com/guides/accessibility
- Tiptap React compatibility: https://tiptap.dev/docs/ui-components/getting-started/overview
- Uppy React: https://uppy.io/docs/react/
- Uppy S3: https://uppy.io/docs/aws-s3/
- StPageFlip: https://github.com/Nodlik/StPageFlip
- Kokonut UI: https://github.com/kokonut-labs/kokonutui
- Bklit UI: https://github.com/bklit/bklit-ui
