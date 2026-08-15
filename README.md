# Flipsnack Clone — Platform Digital Flipbook

Platform SaaS yang mengubah PDF statis menjadi flipbook HTML5 interaktif: bisa dibagikan, disematkan di website, dilindungi aksesnya, dan diukur performanya.

**Status:** 🔨 Vertical slice Fase 1 berjalan — PDF masuk, flipbook keluar.

---

## Coba sekarang

```bash
pnpm install
```

```bash
node fixtures/make-test-pdf.mjs 12
```

```bash
pnpm convert fixtures/pdfs/sample-catalog.pdf --title "Katalog Contoh"
```

```bash
pnpm dev
```

Buka `http://localhost:5173` — daftar flipbook muncul, klik salah satu. Untuk PDF Anda sendiri, ganti path di perintah `convert`.

**Kontrol:** drag/swipe halaman · klik separuh kiri/kanan · panah kiri-kanan · `Home`/`End` · panel halaman/daftar isi/cari · pilihan mode Balik–Geser–Gulir · zoom, bagikan, layar penuh.

### Yang sudah jalan

**Pipeline konversi**

| | |
|---|---|
| PDF → 3 varian resolusi (thumb/preview/full, WebP) | ✅ 12 halaman dalam 2,4 dtk |
| Pemrosesan halaman paralel dengan batas konkurensi | ✅ |
| Ekstraksi teks per halaman → indeks pencarian terpisah | ✅ 481 kata |
| Ekstraksi anotasi link → hotspot yang bisa diklik | ✅ 11 link |
| Ekstraksi outline → daftar isi | ✅ 4 entri |

**Player**

| | |
|---|---|
| Efek **balik** — CSS 3D, mengikuti jari real-time | ✅ |
| Efek **geser** dan **gulir** | ✅ |
| Realisme flip: bayangan lempar ke halaman di bawah, kilau tepi kertas, tumpukan tebal halaman, titik hilang perspektif ikut posisi engsel | ✅ |
| Pemuatan progresif thumb → preview → full | ✅ |
| Dua halaman di desktop, satu halaman di mobile, posisi baca dipertahankan saat berpindah | ✅ |
| Pencarian teks dengan cuplikan & highlight | ✅ |
| Daftar isi & thumbnail strip | ✅ |
| Bagikan: salin tautan + kode embed iframe responsif | ✅ |
| Deep link `?book=<id>&page=<n>` | ✅ |
| Zoom, pan, layar penuh, navigasi keyboard | ✅ |
| Bundle | ✅ **71 KB gzip** (anggaran 150 KB) |

Belum ada: upload lewat web, auth, database, analytics, elemen interaktif selain link, branding, private sharing. Semua itu Fase 2–3 di [roadmap](docs/03-ROADMAP.md).

### Struktur

```
apps/player      Vite + React — reader, deployable terpisah, bundle diawasi ketat
apps/worker      CLI konversi PDF (versi lokal dari job worker)
packages/pdf-engine   ⭐ abstraksi PdfEngine — batas swap engine
packages/manifest     kontrak manifest yang menghubungkan worker ↔ player
fixtures/        generator PDF uji, termasuk pemeriksaan regresi warna
```

Perintah lain: `pnpm typecheck`, `pnpm build`.

---

## Dokumentasi

Baca berurutan:

| # | Dokumen | Isi |
|---|---|---|
| 00 | [Riset & Teardown](docs/00-RESEARCH.md) | Hasil inspeksi live Flipsnack — arsitektur, teknologi player, pipeline konten, model keamanan, inventaris fitur, struktur harga |
| 01 | [PRD](docs/01-PRD.md) | Masalah, persona, scope, model domain, kebutuhan fungsional berprioritas, NFR, metrik, risiko |
| 02 | [Arsitektur & Tech Stack](docs/02-ARCHITECTURE.md) | Bentuk sistem, stack, pipeline konversi, keamanan konten, arsitektur player, skema DB, ADR |
| 03 | [Roadmap](docs/03-ROADMAP.md) | 6 fase dengan deliverable dan exit criteria yang bisa diverifikasi |
| 04 | [Handoff Agen](docs/04-AGENT-HANDOFF.md) | Tools, skills yang perlu di-install, orkestrasi agen, aturan main, jebakan |

---

## Temuan riset yang paling mengubah rencana

1. **Player Flipsnack tidak memakai WebGL.** Nol elemen `<canvas>`. Ini React + styled-components dengan efek flip berbasis CSS 3D transform. Risiko teknis terbesar yang biasanya diasumsikan di proyek seperti ini ternyata tidak ada.
2. **Player adalah aplikasi statis terpisah** di domain sendiri, satu bundle (`reader.gz.js`), tanpa code-splitting. Inilah yang membuat embed cepat dan tahan gangguan.
3. **Halaman dirender di server jadi gambar raster multi-resolusi**, disajikan lewat CDN dengan signed URL. Klien tidak pernah memparsing PDF.
4. **Signature CDN di-refresh setiap 50 detik.** Ini fondasi teknis seluruh fitur privasi berbayar — bukan gate di sisi klien.
5. **Analytics ditulis langsung ke antrian pesan**, memotong API utama sepenuhnya.
6. **Lompatan harga terbesar mereka ($16 → $38) dipicu semata-mata oleh interaktivitas + analytics.** Di situlah uangnya.

---

## Arah teknis

| | |
|---|---|
| **Stack** | TypeScript · Next.js 15 · Vite (player) · Fastify · PostgreSQL + Drizzle · BullMQ + Redis · Cloudflare R2 |
| **Efek flip** | CSS 3D transform — bukan WebGL |
| **Engine PDF** | ⚠️ Belum diputuskan. PDFium+pdf.js (permisif) vs MuPDF (AGPL/komersial). Diselesaikan lewat spike di ADR-001. |
| **Anggaran player** | < 150KB gzip · LCP < 2 dtk · flip 60fps |

---

## Garis waktu

| Fase | Durasi | Milestone |
|---|---|---|
| 0 — Fondasi | 1–2 mgg | Kerangka jalan |
| 1 — Core Loop | 4–5 mgg | **Bisa didemokan** |
| 2 — Bisa dipakai | 3–4 mgg | **MVP bisa dijual** |
| 3 — Monetisasi | 6–8 mgg | Tier berbayar punya arti |
| 4 — Ekspansi | 5–7 mgg | Paritas fitur |
| 5 — Enterprise | — | Berkelanjutan |

**≈ 11 minggu ke MVP yang bisa dijual.**

---

## Status keputusan produk

| Keputusan | Status |
|---|---|
| **Design Studio (editor kanvas)** | ❌ **Dicoret** — diganti jalur impor dari Canva/Figma/InDesign. Hemat 6–8 minggu. |
| **Engine PDF** | ⚠️ Diselesaikan lewat spike ADR-001 di awal Fase 1 |
| Target pasar & payment gateway | ⏸️ Ditahan — wajib dijawab sebelum Fase 2 item 2.17 |
| Model harga | ⏸️ Ditahan |
| Self-host vs cloud | ⏸️ Ditahan — berinteraksi dengan lisensi engine PDF |

Keputusan yang ditahan dijaga tetap reversibel lewat abstraksi `PaymentProvider`, `PdfEngine`, i18n aktif sejak awal, dan harga sebagai data di database — bukan konstanta di kode. Detail: [01-PRD.md §9.3](docs/01-PRD.md).

---

## Langkah berikutnya

Serahkan ke agen pelaksana dengan instruksi: **baca `docs/` berurutan, lalu ikuti [04-AGENT-HANDOFF.md §6](docs/04-AGENT-HANDOFF.md)**.
