# 02 — Arsitektur & Tech Stack

**Basis:** [00-RESEARCH.md](00-RESEARCH.md) · [01-PRD.md](01-PRD.md)

---

## 1. Bentuk sistem

Empat *deployable* terpisah. Pemisahan ini bukan gaya-gayaan — masing-masing punya profil beban, SLA, dan siklus rilis yang berbeda, dan Flipsnack sendiri memisahkannya persis begini.

```
┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  web         │   │  player      │   │  api         │   │  worker      │
│  (Next.js)   │   │  (Vite SPA)  │   │  (Fastify)   │   │  (Node/queue)│
│              │   │              │   │              │   │              │
│ marketing    │   │ reader       │   │ REST + auth  │   │ PDF render   │
│ dashboard    │   │ <150KB       │   │ signing svc  │   │ text extract │
│ overlay edit │   │ embeddable   │   │ webhooks     │   │ thumbnails   │
└──────┬───────┘   └──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       │                  │                  │                  │
       └──────────────────┴────────┬─────────┴──────────────────┘
                                   │
        ┌──────────────┬───────────┼───────────┬──────────────┐
        │              │           │           │              │
   ┌────▼────┐   ┌─────▼────┐ ┌────▼────┐ ┌────▼────┐  ┌─────▼─────┐
   │Postgres │   │  Redis   │ │ R2 / S3 │ │   CDN   │  │ ClickHouse│
   │ (OLTP)  │   │ (queue+  │ │(objects)│ │(signed) │  │(analytics)│
   │         │   │  cache)  │ │         │ │         │  │   [V3]    │
   └─────────┘   └──────────┘ └─────────┘ └─────────┘  └───────────┘
```

**Aturan isolasi yang tidak boleh dilanggar:**

> Player tidak boleh punya dependensi runtime ke `api` selain **satu** endpoint signature dan **satu** endpoint ingest analytics. Jika dashboard mati total, flipbook publik harus tetap terbaca.

Inilah alasan Flipsnack menaruh player di domain sendiri dengan bundle tunggal. Kita tiru.

---

## 2. Tech stack

### 2.1 Rekomendasi utama

| Lapisan | Pilihan | Alasan |
|---|---|---|
| **Bahasa** | TypeScript (strict) di semua service | Satu bahasa, tipe dibagi lewat package internal |
| **Monorepo** | pnpm workspaces + Turborepo | Standar, cepat, caching build |
| **Web (marketing + dashboard)** | Next.js 15 App Router + React 19 | SSR untuk SEO landing page; RSC untuk dashboard |
| **UI** | Tailwind CSS + shadcn/ui + Radix | Cepat, aksesibel by default |
| **Player** | **Vite + React + TypeScript, bundle mandiri** | Bukan Next. Butuh kontrol ukuran bundle absolut |
| **Animasi flip** | CSS 3D transform + Web Animations API | Sesuai temuan riset: tidak butuh WebGL |
| **Gesture** | `@use-gesture/react` | Drag/pinch/swipe lintas perangkat |
| **API** | Fastify + Zod + OpenAPI | Ringan, cepat, kontrak tergenerate |
| **Database** | PostgreSQL 16 | JSONB untuk config elemen; relasional untuk sisanya |
| **ORM** | Drizzle ORM | SQL-first, tipe kuat, migrasi eksplisit, overhead minim |
| **Queue** | BullMQ + Redis | Matang, retry/DLQ/prioritas/progress event bawaan |
| **Object storage** | Cloudflare R2 | **Zero egress fee** — pembunuh risiko biaya terbesar |
| **CDN + signing** | Cloudflare CDN + signed URL | Setara CloudFront signed URL milik Flipsnack |
| **Auth** | Better Auth (atau Clerk untuk mempercepat) | Butuh OAuth, 2FA, dan jalur SSO enterprise nanti |
| **Billing** | Stripe Billing | Subscription, trial, usage limit |
| **Analytics store** | Postgres (V1–V2) → ClickHouse (V3+) | Jangan over-engineer sebelum ada volume |
| **Email** | Resend + React Email | Notifikasi + share via email |
| **Observability** | Sentry + OpenTelemetry + Grafana | Wajib untuk worker dan pipeline konversi |
| **Testing** | Vitest (unit) + Playwright (E2E & regresi visual) | Regresi visual **wajib** untuk render PDF |
| **CI/CD** | GitHub Actions | Standar |
| **Deploy** | Web/Player → Vercel atau Cloudflare Pages · API/Worker → Fly.io atau Railway | Worker butuh CPU & RAM, tidak cocok serverless |

### 2.2 ⚠️ Keputusan bendera merah: engine rendering PDF

Ini keputusan teknis **paling berisiko dan paling mahal jika salah**. Sudah saya verifikasi ke dokumentasi resmi.

| Engine | Lisensi | Render | Text + bbox | Link/anotasi | Outline | Catatan |
|---|---|---|---|---|---|---|
| **MuPDF.js** (`mupdf`) | **AGPL-3.0** atau komersial berbayar | Sangat baik | ✅ `toStructuredText()` | ✅ `page.getLinks()` | ✅ | Fidelitas terbaik, API terlengkap dalam satu library |
| **PDFium** (`@hyzyla/pdfium`) | **BSD-3-Clause** | Sangat baik (engine Chrome) | Terbatas di binding JS | Terbatas | Terbatas | Permisif, tanpa risiko lisensi |
| **pdf.js** (Mozilla) | **Apache-2.0** | Baik | ✅ | ✅ | ✅ | Butuh canvas di Node; fidelitas font sedikit di bawah |
| **Ghostscript** | AGPL / komersial | Sangat baik | ❌ | ❌ | ❌ | Masalah lisensi sama dengan MuPDF |

**Masalahnya:** MuPDF adalah pilihan terbaik secara teknis — satu library menutup render, text-with-bbox, `getLinks()`, dan outline sekaligus (semua terkonfirmasi di dokumentasi Artifex). Tapi **AGPL-3.0 adalah copyleft jaringan**: menjalankannya di server SaaS dapat mewajibkan Anda membuka seluruh source code layanan Anda.

**Rekomendasi saya — jalur permisif:**

```
Render halaman   →  PDFium  (BSD-3-Clause)
Text layer+bbox  →  pdf.js  (Apache-2.0)
Link & outline   →  pdf.js  (Apache-2.0)
```

Dua library, nol risiko lisensi, nol biaya.

**Alternatif — jalur fidelitas:** beli lisensi komersial MuPDF dari Artifex. Kode jadi jauh lebih sederhana (satu library) dan hasil render paling akurat. Layak jika anggaran memungkinkan dan target pasarnya publishing kelas atas yang rewel soal warna & font.

> **AKSI WAJIB DI FASE 1:** jalankan *spike* 3 hari yang merender 30 PDF "sulit" (font eksotis, transparansi, CMYK, PDF/X, CJK, RTL, form field) lewat kedua jalur, lalu bandingkan hasilnya secara visual. Keputusan diambil dari bukti, bukan dari tabel ini. Sisa arsitektur tidak boleh menunggu spike ini — abstraksikan di balik interface `PdfEngine`.

```ts
// packages/pdf-engine/src/types.ts — batas abstraksi wajib
export interface PdfEngine {
  open(buf: Buffer): Promise<PdfDoc>;
}
export interface PdfDoc {
  pageCount(): number;
  renderPage(i: number, dpi: number): Promise<RasterResult>;
  extractText(i: number): Promise<TextSpan[]>;   // + bbox ternormalisasi
  extractLinks(i: number): Promise<LinkAnnot[]>;
  outline(): Promise<OutlineNode[]>;
  destroy(): void;
}
```

Selama semua kode konsumen hanya bicara ke interface ini, mengganti engine di kemudian hari adalah pekerjaan satu hari, bukan satu bulan.

---

## 3. Pipeline konversi

Bagian sistem yang paling menentukan kualitas produk.

```
1. CLIENT   → minta presigned upload URL ke api
2. CLIENT   → PUT PDF langsung ke R2 (tidak lewat api sama sekali)
3. CLIENT   → POST /publications { uploadKey }
4. API      → buat Publication + PublicationVersion (status: processing)
            → enqueue job "convert" ke BullMQ
5. WORKER   → unduh PDF, validasi (terenkripsi? rusak? > batas halaman?)
            → baca metadata: jumlah halaman, dimensi, outline
            → EMIT progress: 5%

   untuk tiap halaman (paralel, konkurensi dibatasi CPU):
            → render @ 200 DPI  → full     (WebP q80)
            → downscale         → preview  (WebP q75, lebar ~900px)
            → downscale         → thumb    (WebP q60, lebar ~200px)
            → ekstrak text span + bbox (dinormalisasi ke 0–1)
            → ekstrak anotasi link → calon Element
            → unggah 3 varian ke R2 dengan key deterministik
            → EMIT progress + "halaman N siap"

            ★ setelah halaman 1–4 siap → tandai versi "previewable"
              (pembaca sudah bisa mulai membaca)

6. WORKER   → simpan manifest.json ke R2 + baris Page ke Postgres
            → indeks text layer (Postgres FTS di V1)
            → status: ready ; kirim notifikasi realtime ke dashboard
```

**Keputusan penting di pipeline:**

- **Halaman diproses paralel dengan batas konkurensi.** PDF 500 halaman tidak boleh memblokir antrian.
- **Varian `full` bisa lazy.** Untuk publication panjang, generate `full` on-demand saat pembaca zoom, lalu cache. Menghemat storage secara dramatis.
- **Key deterministik** (`{versionId}/pages/{n}/{variant}.webp`) → cache-friendly, idempoten, retry aman.
- **Progressive publish** adalah fitur, bukan optimasi. Ini yang membuat time-to-wow < 60 detik tercapai untuk dokumen besar.
- **Job harus idempoten.** Retry tidak boleh menghasilkan duplikat.

---

## 4. Model keamanan konten

Meniru pola Flipsnack, karena polanya memang benar.

```
Pembaca buka player
   │
   ├─→ GET /publications/{slug}/manifest
   │      api cek: published? unlisted? password? terjadwal? dinonaktifkan?
   │      → balikkan manifest + signed token (TTL 5 menit)
   │
   ├─→ Muat aset halaman dari CDN dengan signed URL
   │
   └─→ setiap 50 detik: POST /authorization → signature baru
          ↳ jika publication dinonaktifkan / akses dicabut
            → 403 → player menghentikan pemuatan aset
```

**Konsekuensi yang membuat ini bernilai uang:** fitur *deactivate*, *password*, *expiry*, *share ke orang tertentu*, dan *SSO viewer* semuanya berfungsi nyata karena **hak akses dievaluasi ulang setiap 50 detik di sisi server** — bukan disembunyikan di klien. Tanpa ini, seluruh tier Business tidak punya dasar teknis.

Aturan tambahan:
- Bucket **tidak pernah** publik. Semua akses lewat CDN + signature.
- TTL signature ≤ 5 menit, interval refresh 50 detik.
- Publication publik tetap pakai signed URL — bedanya hanya kebijakan penerbitan signature-nya longgar.
- Rate limit di endpoint signature per IP + per publication.

---

## 5. Arsitektur player

Bagian yang paling menentukan apakah produk ini terasa mahal atau murahan.

### 5.1 Lapisan render

```
Stage                    ← viewport, hitung ukuran & rasio
 └── PageContainer       ← perspective: 1600px; transform-style: preserve-3d
      ├── PageFace       ← <img srcset> varian resolusi + text layer tersembunyi
      ├── PageFace       ← sisi belakang, rotateY(180deg), backface-visibility
      ├── ShadowLayer    ← gradient dinamis mengikuti sudut flip (kunci realisme)
      └── OverlayLayer   ← elemen interaktif, posisi persentase
```

### 5.2 Efek sebagai strategy pattern

Persis seperti struktur `EffectFlip*` yang terlihat di player Flipsnack:

```ts
interface PageEffect {
  name: 'flip' | 'slide' | 'scroll';
  mount(stage: Stage): void;
  goTo(index: number, opts: { animate: boolean }): Promise<void>;
  onDrag(delta: number): void;      // flip mengikuti jari secara real-time
  destroy(): void;
}
```

Kualitas efek flip ditentukan oleh tiga hal, sesuai urutan kepentingan:
1. **Flip mengikuti jari.** Drag harus menggerakkan halaman secara proporsional, bukan hanya memicu animasi saat dilepas. Ini yang membedakan terasa nyata vs terasa palsu.
2. **Bayangan dinamis.** Gradient yang berubah mengikuti sudut rotasi. Tanpa ini halaman terlihat seperti kertas datar yang berputar.
3. **Easing yang benar.** Kurva harus terasa punya massa, bukan linear.

### 5.3 Strategi pemuatan

| Tahap | Aset | Kapan |
|---|---|---|
| Instan | `thumb` (blur-up) | Saat manifest tiba |
| Cepat | `preview` untuk halaman aktif ± 1 | Segera |
| Prefetch | `preview` untuk ± 2..4 | Idle |
| On-settle | `full` untuk halaman aktif | 300ms setelah animasi berhenti |
| On-demand | `full` resolusi zoom | Saat pembaca zoom |

Ditambah: dekode via `createImageBitmap`, `<link rel=preload>` untuk halaman 1–2, dan batalkan permintaan halaman yang sudah terlewati.

### 5.4 Anggaran ketat

| Metrik | Batas |
|---|---|
| Bundle JS (gzip) | 150 KB |
| Waktu ke halaman pertama (4G) | 2 dtk |
| Frame rate flip | 60fps di perangkat mid-range |
| Permintaan jaringan sebelum halaman 1 tampil | ≤ 4 |

Batasan ini masuk ke CI. Build gagal jika bundle melewati anggaran.

---

## 6. Skema database (inti)

```sql
account(id, name, plan, stripe_customer_id, created_at)
workspace(id, account_id, name, slug)
member(workspace_id, user_id, role)
user(id, email, name, password_hash, totp_secret, created_at)

publication(
  id, workspace_id, folder_id, slug UNIQUE,
  title, description, meta_title, meta_description,
  status,                    -- draft|processing|ready|published|deactivated
  current_version_id,
  visibility,                -- public|unlisted|password|restricted
  password_hash, publish_at, expire_at,
  settings JSONB,            -- efek, tema, izin download/print, TOC, audio
  created_at, updated_at
)

publication_version(
  id, publication_id, version_no,
  source_key, page_count, status, manifest_key,
  created_at
)                            -- IMMUTABLE

page(
  id, version_id, index,
  width, height,             -- dimensi PDF asli (pt)
  assets JSONB,              -- { thumb: key, preview: key, full: key|null }
  text_content tsvector,     -- untuk pencarian
  text_spans JSONB           -- [{ text, x, y, w, h }] ternormalisasi 0–1
)

element(
  id, page_id, type,         -- link|button|video|form|product|spotlight|...
  x, y, w, h,                -- FRAKSI 0–1, bukan piksel
  z_index,
  config JSONB,              -- payload spesifik per tipe
  created_at
)

brand_kit(id, workspace_id, logo_key, colors JSONB, fonts JSONB, favicon_key)
custom_domain(id, workspace_id, hostname, cert_status, verified_at)
bookshelf(id, workspace_id, slug, title, publication_ids)
form_submission(id, element_id, publication_id, data JSONB, created_at)

-- analytics (V1: Postgres; V3: pindah ke ClickHouse)
analytics_event(
  id, publication_id, version_id, session_id,
  type, page_index, element_id,
  duration_ms, referrer, country, device,
  ip_hash,                   -- HASH, bukan IP mentah — GDPR
  created_at
)
```

**Indeks yang wajib ada sejak awal:** `publication(slug)`, `page(version_id, index)`, `element(page_id)`, `analytics_event(publication_id, created_at)`, dan GIN pada `page.text_content`.

---

## 7. Struktur repository

```
flipsnack/
├── apps/
│   ├── web/                 # Next.js — marketing + dashboard + overlay editor
│   ├── player/              # Vite SPA — reader (deploy terpisah)
│   ├── api/                 # Fastify — REST, auth, signing, ingest
│   └── worker/              # BullMQ consumer — konversi PDF
├── packages/
│   ├── db/                  # Drizzle schema + migrasi
│   ├── pdf-engine/          # ⭐ abstraksi engine PDF (batas swap)
│   ├── manifest/            # tipe & validator manifest publication
│   ├── shared/              # tipe, konstanta, util lintas app
│   ├── ui/                  # komponen bersama (web saja, BUKAN player)
│   ├── billing/             # ⭐ abstraksi PaymentProvider (batas swap gateway)
│   ├── i18n/                # kunci terjemahan, default Inggris
│   └── analytics/           # definisi event + klien ingest
├── fixtures/
│   └── pdfs/                # ⭐ 30+ PDF sulit untuk regresi visual
├── docs/                    # PRD, riset, roadmap, ADR
│   └── adr/                 # Architecture Decision Records
└── .github/workflows/
```

`packages/ui` sengaja **tidak** dipakai player. Player harus bebas dari dependensi apa pun yang tidak esensial demi anggaran 150KB.

---

## 8. Keputusan arsitektur & alasannya (ringkas ADR)

| # | Keputusan | Alasan | Alternatif yang ditolak |
|---|---|---|---|
| 1 | Render PDF di server jadi raster | Konsistensi lintas browser, player ringan; terkonfirmasi dari Flipsnack | Render pdf.js di klien — berat, tidak konsisten, lambat di mobile |
| 2 | CSS 3D, bukan WebGL | Riset membuktikan Flipsnack pakai DOM/CSS (0 canvas); lebih baik untuk a11y & SEO | Three.js/PIXI — kompleksitas tinggi tanpa keuntungan yang terbukti |
| 3 | Player sebagai app terpisah | Anggaran bundle, isolasi kegagalan, embed lintas-origin | Route di dalam Next.js — bundle membengkak, tidak bisa isolasi |
| 4 | Koordinat elemen dalam fraksi | Resolusi-independen selamanya | Piksel — rusak saat resolusi render berubah |
| 5 | Versi immutable | "Replace PDF" tanpa memutus link publik | Mutasi in-place — kehilangan riwayat, cache tidak konsisten |
| 6 | Cloudflare R2 | Zero egress fee menghilangkan risiko biaya terbesar | S3+CloudFront — biaya egress tidak terprediksi |
| 7 | Abstraksi `PdfEngine` | Lisensi engine belum diputuskan; jangan biarkan itu memblokir | Panggil library langsung — mengunci keputusan terlalu dini |
| 8 | Jalur ingest analytics terpisah | Traffic pembaca tidak boleh menjatuhkan API | Endpoint di API utama — coupling berbahaya |
| 9 | Postgres dulu, ClickHouse nanti | Hindari over-engineering sebelum ada volume | ClickHouse sejak hari 1 — beban ops tanpa manfaat |
| 10 | Drizzle, bukan Prisma | Kontrol SQL, bundle kecil, migrasi eksplisit | Prisma — engine binary, kurang cocok untuk worker |
| 11 | **Tidak membangun Design Studio** | Setara ukuran V1–V3 digabung; mayoritas pengguna hanya upload PDF; bersaing dengan Canva bukan keunggulan kita | Editor kanvas from-scratch — hemat 6–8 mgg dengan mencoretnya |
| 12 | **Abstraksi `PaymentProvider`** | Target pasar & gateway masih ditahan; keputusan tidak boleh terkunci diam-diam oleh kode | Panggil SDK Stripe langsung — mengunci pasar sebelum diputuskan |
| 13 | **i18n aktif sejak baris pertama UI** | Alasan sama dengan #12; retrofit i18n jauh lebih mahal daripada memulainya benar | Hardcode Inggris, terjemahkan nanti |

Setiap keputusan baru yang signifikan wajib ditulis sebagai ADR di `docs/adr/`.

### 8.1 Batas abstraksi yang menjaga keputusan tetap terbuka

Tiga pertanyaan produk masih ditahan ([01-PRD.md §9.2](01-PRD.md)): target pasar, model harga, dan self-host vs cloud. Ketiganya dijaga tetap murah untuk dijawab lewat tiga batas ini:

```ts
// packages/billing — pasar & gateway belum diputuskan
export interface PaymentProvider {
  createCheckout(plan: Plan, workspace: WorkspaceId): Promise<CheckoutSession>;
  cancelSubscription(id: SubscriptionId): Promise<void>;
  handleWebhook(raw: Buffer, sig: string): Promise<BillingEvent>;
}
// impl pertama: StripeProvider. Midtrans/Xendit menyusul tanpa menyentuh logika bisnis.

// packages/pdf-engine — lisensi & self-host belum diputuskan
export interface PdfEngine { /* lihat §2.2 */ }
```

Ditambah dua aturan data: **harga, mata uang, dan definisi plan hidup di tabel database**, bukan konstanta di kode; dan **region storage/DB adalah konfigurasi**, tidak pernah di-hardcode.

---

## 9. Yang paling mudah diremehkan

Tiga hal ini yang biasanya membunuh proyek seperti ini. Prioritaskan sejak awal:

1. **Fidelitas render PDF.** Bukan "PDF jadi gambar" — itu mudah. Yang sulit: font tertanam, subset font, transparansi, blend mode, warna spot, CMYK→RGB, dan CJK. Suite regresi visual di `fixtures/pdfs/` adalah aset paling berharga di repo ini. Bangun di Fase 1, bukan Fase 5.

2. **Rasa animasi flip.** Perbedaan antara produk yang terasa $85/bulan dan yang terasa gratisan seluruhnya ada di sini. Anggarkan waktu penyetelan yang serius, dan uji di perangkat fisik — bukan di DevTools throttling.

3. **Ekonomi unit.** Satu katalog viral 300 halaman dengan 100k pembaca bisa menghabiskan anggaran bulanan dalam sehari jika storage dan bandwidth tidak dijaga. Pasang pelacakan biaya per publication sejak V1.
