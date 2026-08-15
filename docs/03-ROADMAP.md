# 03 — Roadmap Eksekusi

**Basis:** [01-PRD.md](01-PRD.md) · [02-ARCHITECTURE.md](02-ARCHITECTURE.md)

Estimasi mengasumsikan **1–2 developer + agen AI**. Setiap fase punya *exit criteria* yang bisa diverifikasi — bukan "selesai kira-kira", tapi bisa didemokan.

---

## Prinsip urutan

> **Bangun jalur nilai vertikal sedini mungkin, lalu perlebar.**

Fase 1 harus menghasilkan satu jalur lengkap dari upload sampai orang lain bisa membacanya di browser mereka. Semua sesudahnya adalah pelebaran. Jangan pernah membangun dashboard lengkap sebelum player-nya bekerja — dashboard tanpa player adalah nol nilai, player tanpa dashboard sudah bisa didemokan.

---

## Fase 0 — Fondasi · 1–2 minggu

**Tujuan:** kerangka yang bisa dibangun di atasnya tanpa refactor besar.

| # | Deliverable |
|---|---|
| 0.1 | Monorepo pnpm + Turborepo, 4 app + 6 package sesuai [02-ARCHITECTURE.md §7](02-ARCHITECTURE.md) |
| 0.2 | TypeScript strict, ESLint, Prettier, konfigurasi bersama |
| 0.3 | Docker Compose lokal: Postgres + Redis + MinIO (pengganti R2 saat dev) |
| 0.4 | Skema Drizzle awal + migrasi + seed |
| 0.5 | Auth: sign-up/in email + OAuth Google, sesi, middleware proteksi route |
| 0.6 | Wiring R2/S3: presigned upload, penerbitan signed URL |
| 0.7 | BullMQ terpasang, satu job "hello world" end-to-end dengan progress event |
| 0.8 | CI: typecheck, lint, test, build semua app |
| 0.9 | **`fixtures/pdfs/` diisi 30+ PDF sulit** (font eksotis, CJK, RTL, transparansi, CMYK, PDF/X, terenkripsi, rusak, 500 halaman, 1 halaman) |

**Exit criteria:** `pnpm dev` menyalakan semua service; user bisa daftar, login, upload file ke storage, dan melihat job berjalan sampai selesai di dashboard kosong.

---

## Fase 1 — Core Loop · 4–5 minggu ⭐ **fase terpenting**

**Tujuan:** PDF masuk → flipbook keluar → orang lain bisa membacanya.

### 1A. Spike engine PDF (3 hari, **lakukan pertama**)

Render seluruh `fixtures/pdfs/` lewat dua jalur:
- **Jalur A:** PDFium (render) + pdf.js (text/link/outline) — permisif
- **Jalur B:** MuPDF.js — fidelitas terbaik, tapi AGPL

Bandingkan: akurasi visual, kecepatan, penggunaan memori, kelengkapan API. Tulis hasilnya sebagai **ADR-001**. Implementasikan pemenangnya di balik interface `PdfEngine`.

> Fase 1B–1E **tidak menunggu** spike ini. Kerjakan paralel terhadap interface.

### 1B. Pipeline konversi

| # | Deliverable |
|---|---|
| 1.1 | Worker: unduh → validasi → render 3 varian WebP → unggah ke R2 |
| 1.2 | Ekstraksi text layer dengan bbox ternormalisasi 0–1 |
| 1.3 | Ekstraksi anotasi link → calon Element |
| 1.4 | Ekstraksi outline → Table of Contents |
| 1.5 | Emisi progress real-time → dashboard (SSE atau polling) |
| 1.6 | Generasi `manifest.json` |
| 1.7 | Retry, dead-letter queue, pesan error yang bisa dimengerti user |
| 1.8 | Pemrosesan halaman paralel dengan batas konkurensi |
| 1.9 | **Progressive publish** — halaman 1–4 siap ⇒ sudah bisa dibaca |

### 1C. Player v1

| # | Deliverable |
|---|---|
| 1.10 | App Vite mandiri, memuat manifest, merender halaman |
| 1.11 | **Efek flip** dengan CSS 3D — mengikuti drag secara real-time |
| 1.12 | Bayangan dinamis mengikuti sudut rotasi |
| 1.13 | Progressive loading thumb → preview → full + prefetch ±2 |
| 1.14 | Navigasi: klik, drag/swipe, keyboard, tombol UI |
| 1.15 | Zoom & pan (pinch di mobile) |
| 1.16 | Responsif: dua halaman di desktop, satu halaman di mobile |
| 1.17 | Fullscreen + deep link `?page=N` |
| 1.18 | Controller bar: nomor halaman, navigasi, fullscreen, zoom |

### 1D. Penyajian & keamanan

| # | Deliverable |
|---|---|
| 1.19 | Endpoint manifest publik dengan pemeriksaan visibility |
| 1.20 | Layanan signature + refresh 50 detik dari player |
| 1.21 | Route publik `/{workspace}/{slug}` — SSR untuk SEO, iframe ke player |
| 1.22 | Generator kode embed |

### 1E. Kualitas

| # | Deliverable |
|---|---|
| 1.23 | **Suite regresi visual Playwright** atas `fixtures/pdfs/` |
| 1.24 | Anggaran bundle player ditegakkan di CI (gagal jika > 150KB gzip) |
| 1.25 | Uji perangkat fisik: iPhone, Android mid-range |

**Exit criteria:**
- Upload PDF 50 halaman → selesai < 90 dtk p95, halaman 1 terbaca < 15 dtk.
- Link publik terbuka di perangkat orang lain, flip terasa mulus di iPhone dan Android mid-range.
- Kode embed berfungsi di CodePen pihak ketiga.
- Bundle player < 150KB gzip.
- Suite regresi visual hijau atas 30 PDF.

---

## Fase 2 — Produk yang bisa dipakai · 3–4 minggu

**Tujuan:** cukup lengkap untuk dijual.

| # | Deliverable |
|---|---|
| 2.1 | Dashboard: grid/list, thumbnail, cari, urutkan, folder, label |
| 2.2 | Editor metadata publication: judul, deskripsi, slug, meta SEO |
| 2.3 | Manajemen status: draft / published / unlisted / deactivated |
| 2.4 | Replace PDF → versi baru, URL dipertahankan (buktikan link lama tetap hidup) |
| 2.5 | Merge multi-PDF |
| 2.6 | Duplikasi publication |
| 2.7 | Efek **slide** dan **scroll** |
| 2.8 | Single page view |
| 2.9 | UI Table of Contents di player |
| 2.10 | **Pencarian teks di dalam flipbook** + highlight |
| 2.11 | Thumbnail strip / page picker |
| 2.12 | Share: link, sosial (OG/Twitter card), QR code, embed |
| 2.13 | Izin download PDF & print |
| 2.14 | Watermark tier gratis |
| 2.15 | Aksesibilitas: keyboard penuh, ARIA, `prefers-reduced-motion`, screen reader membaca text layer |
| 2.16 | SEO: SSR halaman publik dengan text layer sebagai HTML, JSON-LD, sitemap |
| 2.17 | Billing: plan, kuota, trial 14 hari, enforcement batas — **di balik abstraksi `PaymentProvider`**, Stripe sebagai implementasi pertama |
| 2.18 | Marketing site: landing, pricing, halaman fitur |
| 2.19 | Email transaksional (Resend) |
| 2.20 | i18n aktif: tidak ada string ter-hardcode, default Inggris, harga & mata uang sebagai data di DB |

> ⚠️ **Gerbang keputusan sebelum 2.17.** Target pasar dan model harga masih ditahan ([01-PRD.md §9.2](01-PRD.md)). Item 2.17 dan 2.20 harus dibangun dengan asumsi jawabannya bisa apa saja — gateway dan mata uang wajib bisa ditukar tanpa menyentuh logika bisnis. Tanyakan ke pemilik produk sebelum memulai 2.17.

**Exit criteria:** pengguna asing bisa mendaftar, mempublikasikan, membagikan, menyematkan, dan membayar — tanpa bantuan. **Ini titik MVP yang bisa dijual.**

---

## Fase 3 — Monetisasi · 6–8 minggu

**Tujuan:** membuka pembeda tier berbayar. Berdasarkan riset, lompatan harga terbesar Flipsnack ($16→$38) dipicu **semata-mata** oleh interaktivitas + analytics. Ini fase yang menghasilkan uang.

### 3A. Overlay Editor & interaktivitas

| # | Deliverable |
|---|---|
| 3.1 | **Overlay Editor** — tempatkan hotspot di atas halaman terender (bukan editor kanvas) |
| 3.2 | Tempatkan, ukur, pindahkan, susun z-index; snap & align; undo/redo |
| 3.3 | Link eksternal & internal |
| 3.4 | Terima/tolak link yang terdeteksi otomatis dari PDF |
| 3.5 | Tombol (CTA, sosial, buy) |
| 3.6 | Video YouTube/Vimeo + upload sendiri |
| 3.7 | Audio + background audio |
| 3.8 | Spotlight (popup gambar) |
| 3.9 | Photo slideshow |
| 3.10 | Product tag (gambar, harga, SKU, link) |
| 3.11 | Lead form & contact form + penyimpanan & notifikasi submisi |
| 3.12 | Caption & tooltip |
| 3.13 | Salin elemen ke halaman lain / terapkan ke semua halaman |

### 3B. Analitik

| # | Deliverable |
|---|---|
| 3.14 | Endpoint ingest terpisah, batched, `sendBeacon` saat unload |
| 3.15 | Skema event: view_start, page_view+durasi, element_click, download, share, form_submit, session_end |
| 3.16 | Worker agregasi → tabel ringkasan |
| 3.17 | Dashboard overview: view, pembaca unik, waktu rata-rata, completion rate |
| 3.18 | Statistik per halaman + kurva drop-off |
| 3.19 | Lokasi, perangkat, referrer |
| 3.20 | Trackable link per kanal |
| 3.21 | Laporan lead capture |
| 3.22 | Export CSV + integrasi Google Analytics/GTM |
| 3.23 | Kepatuhan GDPR: hash IP, hormati DNT, retensi terkonfigurasi |

### 3C. Branding & privasi

| # | Deliverable |
|---|---|
| 3.24 | Tema player: warna background, warna aksen |
| 3.25 | Logo di player + hapus branding kita |
| 3.26 | Brand kit: warna, font, logo, favicon |
| 3.27 | Proteksi password |
| 3.28 | Jadwal publish & kedaluwarsa |
| 3.29 | **Deactivate** — pencabutan akses instan (buktikan berhenti ≤ 60 dtk) |
| 3.30 | Share ke email tertentu + verifikasi OTP |
| 3.31 | Akses via access code |
| 3.32 | Pembatasan domain untuk embed |

**Exit criteria:** tiga tier harga punya pembeda nyata yang bisa didemokan. Publisher bisa menambahkan link ke halaman dalam < 15 detik dan melihat klik-nya di analytics dalam < 1 menit.

---

## Fase 4 — Ekspansi · 5–7 minggu

**Tujuan:** paritas fitur dengan pemain lama.

| # | Deliverable |
|---|---|
| 4.1 | Workspace, undang anggota, role & permission |
| 4.2 | Asset library per workspace |
| 4.3 | Bookshelf |
| 4.4 | **Custom domain** + penerbitan TLS otomatis |
| 4.5 | Header/footer & favicon kustom |
| 4.6 | Email ber-branding |
| 4.7 | RTL + lokalisasi tooltip + i18n dashboard |
| 4.8 | Iframe embed element (peta, virtual tour, survei) |
| 4.9 | Shopping list & order via email |
| 4.10 | Kuis & pertanyaan |
| 4.11 | Tabel & chart |
| 4.12 | **Jalur impor dari alat desain** — panduan ekspor untuk Canva, Figma, InDesign, Google Slides; deteksi & penanganan kuirk PDF masing-masing alat |
| 4.13 | *(Opsional)* Impor langsung via Canva Connect API / Figma REST API |
| 4.14 | Template gallery + landing SEO per kategori — template disimpan sebagai PDF + preset elemen, bukan dokumen editable |
| 4.15 | Export: JPG, PNG, GIF, MP4, HTML5 self-host |
| 4.16 | Click heatmap |

> **✅ Design Studio dicoret dari roadmap (keputusan 2026-08-15).** Kita tidak membangun editor kanvas. Item 4.12–4.13 menggantikannya dengan biaya jauh lebih kecil: semua alat desain sudah mengekspor PDF, jadi jalur ini memakai pipeline konversi yang sama dan hanya butuh lapisan tipis di atasnya. Menghemat **6–8 minggu** dan menghindari persaingan langsung dengan Canva di ranah yang bukan keunggulan kita. Detail: [01-PRD.md §3.3](01-PRD.md).

---

## Fase 5 — Enterprise · berkelanjutan

SSO (SAML/OIDC) untuk user & viewer · 2FA enforced · activity log & usage report · multi-team/brand · REST API publik + webhook · Zapier · generator katalog produk (SKU, PIM/ERP, CSV/XLSX, Google Sheets) · order otomatis · fitur AI (terjemahan flipbook, generate TOC, ringkasan aksesibilitas) · leak-protection watermark · jalur kepatuhan SOC 2 / ISO 27001 / HIPAA.

---

## Ringkasan waktu

| Fase | Durasi | Kumulatif | Milestone |
|---|---|---|---|
| 0 — Fondasi | 1–2 mgg | 2 mgg | Kerangka jalan |
| 1 — Core Loop | 4–5 mgg | 7 mgg | **Bisa didemokan** |
| 2 — Bisa dipakai | 3–4 mgg | 11 mgg | **Bisa dijual (MVP)** |
| 3 — Monetisasi | 6–8 mgg | 19 mgg | **Tier berbayar punya arti** |
| 4 — Ekspansi | 5–7 mgg | 26 mgg | Paritas fitur |
| 5 — Enterprise | — | — | Berkelanjutan |

**≈ 11 minggu ke MVP yang bisa dijual. ≈ 19 minggu ke produk yang benar-benar bisa bersaing.**

*Fase 4 turun dari 8–12 minggu ke 5–7 minggu setelah Design Studio dicoret.*

---

## Gerbang kualitas per fase

Tidak ada fase yang dinyatakan selesai tanpa semua ini hijau:

- [ ] Typecheck, lint, unit test lolos
- [ ] E2E Playwright untuk alur baru lolos
- [ ] Regresi visual atas `fixtures/pdfs/` tidak ada regresi
- [ ] Anggaran bundle player masih terpenuhi
- [ ] Diuji di perangkat fisik (iOS + Android) untuk perubahan yang menyentuh player
- [ ] Audit aksesibilitas untuk UI baru
- [ ] ADR ditulis untuk setiap keputusan arsitektur baru
- [ ] Dampak biaya per publication ditinjau
