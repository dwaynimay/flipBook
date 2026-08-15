# 01 — PRD: Platform Digital Flipbook (codename **Flipsnack Clone**)

**Versi:** 1.0 · **Tanggal:** 2026-08-15 · **Status:** Draft untuk eksekusi
**Basis riset:** [00-RESEARCH.md](00-RESEARCH.md)

---

## 1. Ringkasan eksekutif

Kita membangun platform SaaS yang mengubah **PDF statis menjadi flipbook HTML5 interaktif** yang bisa dibagikan, disematkan di website, dilindungi aksesnya, dan diukur performanya.

Produk ini menyerang celah yang sama dengan Flipsnack/Issuu/Heyzine: perusahaan punya katalog, majalah, brosur, dan laporan dalam bentuk PDF — format yang mati, tidak terukur, dan buruk di mobile. Kita menghidupkannya tanpa mengharuskan mereka mendesain ulang apa pun.

**Prinsip produk yang tidak bisa ditawar:**

| # | Prinsip | Implikasi |
|---|---|---|
| 1 | **Time-to-wow < 60 detik** | Dari upload PDF sampai link flipbook siap dibagikan, tanpa login untuk percobaan pertama. |
| 2 | **Player adalah produk** | Semua yang dilihat pembaca harus mulus, cepat (< 2 dtk halaman pertama), dan sempurna di mobile. |
| 3 | **Render di server, tampilkan di klien** | Klien tidak pernah memparsing PDF. Konsistensi lintas browser dijamin. |
| 4 | **Privasi sebagai arsitektur** | Signed URL berumur pendek sejak hari pertama, bukan fitur tambahan. |
| 5 | **Editor menyusul, bukan mendahului** | Design Studio adalah fase akhir. MVP tidak butuh editor kanvas. |

---

## 2. Masalah & peluang

### 2.1 Masalah pengguna

| Persona | Rasa sakit | Yang mereka inginkan |
|---|---|---|
| **Marketer B2B/retail** | Katalog PDF 60 halaman, 80MB, dikirim via email, tidak ada yang tahu apakah dibuka | Link yang bisa dilacak, terlihat premium, dan bisa diklik ke produk |
| **Tim HR / Internal Comms** | Employee handbook PDF tidak pernah dibaca; tidak boleh bocor keluar | Dokumen menarik + kontrol akses ketat |
| **Penerbit / media** | Majalah digital butuh terasa seperti majalah, bukan scroll PDF | Pengalaman baca flip yang nyata + monetisasi |
| **Real estate / travel** | Brosur butuh peta, virtual tour, video | Overlay interaktif tanpa coding |
| **Agency** | Kelola banyak klien & brand | Multi-workspace, branding per klien, white-label |

### 2.2 Kenapa sekarang & kenapa kita bisa menang

Pemain lama menagih $38–85/bulan untuk **satu seat**. Struktur biaya mereka warisan (AWS + CloudFront + tim besar). Dengan stack modern (R2 tanpa biaya egress, edge compute, worker rendering yang efisien) kita bisa menawarkan interaktivitas di tier lebih murah — dan interaktivitas justru titik lompatan harga terbesar mereka ($16 → $38).

**Wedge kita:** interaktivitas & analytics dasar masuk di tier termurah. Monetisasi digeser ke branding, privasi, dan volume.

---

## 3. Scope

### 3.1 Masuk scope (V1 → V3)

Konversi PDF · Player (flip/slide/scroll) · Dashboard · Sharing & embed · Overlay interaktif · Analytics · Branding & custom domain · Private sharing · Tim & workspace

### 3.2 Ditunda eksplisit (V4+)

Template gallery · AI features · Katalog otomatis dari PIM/ERP · Integrasi Salesforce/HubSpot/MLS · Sertifikasi ISO/HIPAA · Aplikasi mobile native

### 3.3 Di luar scope permanen

**Design Studio (editor kanvas from-scratch)** — ✅ *diputuskan 2026-08-15* · Editor PDF (kita tidak mengubah PDF sumber) · Print-on-demand · DAM umum · Marketplace desainer

> **Keputusan Design Studio.** Kita **tidak** membangun editor kanvas. Sebagai gantinya: **jalur impor dari alat desain yang sudah dipakai pengguna** (Canva, Figma, InDesign, Google Slides) — semuanya sudah mengekspor PDF, yang berarti jalur ini gratis dari sisi pipeline karena memakai konverter yang sama. Yang perlu dibangun hanyalah lapisan tipis: panduan ekspor per alat, dan (opsional, V4) impor langsung via Canva Connect API / Figma REST API.
>
> **Alasan:** item ini sendirian setara ukuran V1–V3 digabung, sementara mayoritas pengguna Flipsnack sendiri hanya mengunggah PDF. Membangunnya berarti bersaing dengan Canva di ranah yang bukan keunggulan kita. Menghemat **6–8 minggu** dan menajamkan posisi produk: *kami membuat dokumen Anda hidup, bukan menggantikan alat desain Anda.*

---

## 4. Konsep & model domain

```
Account
 └── Workspace (multi-brand, multi-tim)
      ├── Member (role: owner | admin | editor | viewer)
      ├── BrandKit (logo, warna, font, favicon, domain)
      ├── Folder / Label
      ├── Publication ("flipbook")
      │    ├── PublicationVersion   ← sumber kebenaran konten
      │    │    └── Page[]
      │    │         ├── PageAsset[]   (varian resolusi: thumb/preview/full)
      │    │         ├── TextLayer     (untuk search + a11y + SEO)
      │    │         └── Element[]     (overlay interaktif)
      │    ├── ShareSettings (visibility, password, jadwal, domain)
      │    └── AnalyticsStream
      ├── Bookshelf (kumpulan publication)
      └── AssetLibrary (gambar, video, SVG)
```

### 4.1 Keputusan model data yang kritis

**a. Versi, bukan mutasi.** `PublicationVersion` immutable. "Replace PDF" membuat versi baru; link publik tetap sama. Ini yang memungkinkan fitur *"share once, update the link as many times you want"* tanpa memutus URL yang sudah tersebar.

**b. Koordinat elemen dalam persentase.** Setiap `Element` menyimpan `{ x, y, w, h }` sebagai **fraksi 0–1 relatif terhadap dimensi halaman**, bukan piksel. Konsekuensinya: overlay presisi di layar apa pun, dan tetap valid saat resolusi render berubah.

**c. Halaman = raster + text layer terpisah.** Gambar untuk tampilan, teks untuk pencarian/aksesibilitas/SEO. Keduanya diekstrak di worker yang sama.

**d. Element bersifat polimorfik.** Satu tabel dengan `type` + kolom `config` JSONB. Menambah tipe elemen baru tidak butuh migrasi skema.

---

## 5. Kebutuhan fungsional

Prioritas: **P0** = MVP, wajib. **P1** = rilis publik. **P2** = monetisasi. **P3** = enterprise.

### 5.1 Ingest & konversi

| ID | Kebutuhan | Prio |
|---|---|---|
| ING-1 | Upload PDF via drag-drop langsung ke object storage (presigned URL, bypass server aplikasi) | P0 |
| ING-2 | Validasi: tipe file, ukuran, jumlah halaman, PDF terenkripsi/rusak | P0 |
| ING-3 | Job konversi asinkron dengan progres real-time ke UI | P0 |
| ING-4 | Render tiap halaman → 3 varian: `thumb` (~200px), `preview` (~900px), `full` (~2000px) | P0 |
| ING-5 | Output WebP + fallback JPEG; AVIF opsional | P0 |
| ING-6 | Ekstraksi text layer per halaman (posisi + konten) | P0 |
| ING-7 | Ekstraksi anotasi link PDF → otomatis jadi `Element` tipe link | P1 |
| ING-8 | Deteksi URL dalam teks polos → tawarkan auto-link | P1 |
| ING-9 | Deteksi outline/bookmark PDF → generate Table of Contents | P1 |
| ING-10 | Merge beberapa PDF jadi satu publication | P1 |
| ING-11 | Replace PDF → versi baru, URL publik dipertahankan | P1 |
| ING-12 | Retry otomatis + dead-letter queue + pesan error yang bisa dimengerti user | P0 |

**Kriteria penerimaan ING:** PDF 50 halaman ukuran A4 selesai konversi dalam **< 90 detik p95**. Halaman pertama tersedia untuk dibaca sebelum seluruh dokumen selesai (streaming/progressive publish).

### 5.2 Player

| ID | Kebutuhan | Prio |
|---|---|---|
| PLR-1 | Efek **flip** — animasi 3D dua halaman via CSS transform | P0 |
| PLR-2 | Efek **slide** dan **scroll** sebagai alternatif | P1 |
| PLR-3 | Progressive loading: `thumb` → `preview` → `full` saat halaman diam | P0 |
| PLR-4 | Prefetch n±2 halaman | P0 |
| PLR-5 | Navigasi: klik tepi, drag/swipe, panah kiri-kanan, scroll, tombol | P0 |
| PLR-6 | Zoom & pan (pinch di mobile, scroll+drag di desktop) | P0 |
| PLR-7 | Thumbnail strip / page picker | P1 |
| PLR-8 | Table of Contents | P1 |
| PLR-9 | Pencarian teks di dalam flipbook + highlight hasil | P1 |
| PLR-10 | Fullscreen | P0 |
| PLR-11 | Deep link `?page=N`, sinkron dengan history browser | P0 |
| PLR-12 | Single page view (mode presentasi) | P1 |
| PLR-13 | Responsif: desktop dua halaman, mobile satu halaman otomatis | P0 |
| PLR-14 | Dukungan RTL | P2 |
| PLR-15 | Background audio | P2 |
| PLR-16 | Share bar: link, sosial, QR, email, embed code | P1 |
| PLR-17 | Download PDF & print (tergantung izin penerbit) | P1 |
| PLR-18 | Aksesibilitas: navigasi keyboard penuh, ARIA, screen reader membaca text layer, `prefers-reduced-motion` menonaktifkan animasi flip | P1 |
| PLR-19 | Lokalisasi tooltip | P2 |
| PLR-20 | Watermark untuk tier gratis | P1 |

**Kriteria penerimaan PLR:**
- Halaman pertama tampil (LCP) **< 2 detik** di 4G.
- Animasi flip **60fps** di perangkat mid-range (target: Moto G Power kelas).
- Bundle player **< 150KB gzip**.
- Player berfungsi penuh dalam iframe lintas-origin.

### 5.3 Dashboard & manajemen

| ID | Kebutuhan | Prio |
|---|---|---|
| DSH-1 | CRUD publication, grid + list view, thumbnail | P0 |
| DSH-2 | Folder, label, pencarian, sorting | P1 |
| DSH-3 | Metadata: judul, deskripsi, slug URL, meta SEO | P0 |
| DSH-4 | Status: draft / published / unlisted / deactivated | P0 |
| DSH-5 | Duplikasi publication | P1 |
| DSH-6 | Bookshelf (kumpulan publik) | P2 |
| DSH-7 | Asset library per workspace | P2 |
| DSH-8 | Usage meter vs kuota plan | P1 |

### 5.4 Distribusi & akses

| ID | Kebutuhan | Prio |
|---|---|---|
| SHR-1 | Link publik dengan slug yang bisa diedit | P0 |
| SHR-2 | Kode embed iframe responsif | P0 |
| SHR-3 | Generator QR code | P1 |
| SHR-4 | Share ke sosial dengan Open Graph & Twitter card yang benar | P1 |
| SHR-5 | Unlisted (tidak terindeks, hanya via link) | P0 |
| SHR-6 | Proteksi password | P2 |
| SHR-7 | Share ke email tertentu + verifikasi OTP | P2 |
| SHR-8 | Akses via access code | P2 |
| SHR-9 | Jadwal publish & tanggal kedaluwarsa | P2 |
| SHR-10 | Deactivate — memutus akses secara instan pada semua link yang sudah tersebar | P2 |
| SHR-11 | Pembatasan domain untuk embed | P2 |
| SHR-12 | Leak-protection watermark (email pembaca ter-overlay) | P3 |
| SHR-13 | SSO untuk viewer (SAML/OIDC) | P3 |
| SHR-14 | Export HTML5 untuk self-hosting | P3 |

**Kriteria penerimaan SHR-10:** setelah deactivate, permintaan aset berikutnya harus gagal dalam **≤ 60 detik** — dijamin oleh siklus refresh signature, bukan oleh state di klien.

### 5.5 Interaktivitas

Semua elemen adalah overlay bebas-posisi di atas halaman, dikelola lewat **Overlay Editor** (editor ringan yang menempatkan hotspot di atas halaman yang sudah dirender — **bukan** editor kanvas penuh).

| ID | Tipe elemen | Prio |
|---|---|---|
| INT-1 | Link eksternal & internal (lompat halaman) | P0 |
| INT-2 | Tombol (CTA, sosial, buy) | P1 |
| INT-3 | Video: YouTube, Vimeo, upload sendiri | P2 |
| INT-4 | Audio | P2 |
| INT-5 | Spotlight — gambar dibuka sebagai popup | P2 |
| INT-6 | Photo slideshow | P2 |
| INT-7 | Product tag (gambar, harga, SKU, link, add-to-list) | P2 |
| INT-8 | Lead form / contact form dengan penyimpanan submisi | P2 |
| INT-9 | Caption & tooltip | P2 |
| INT-10 | Iframe embed (peta, virtual tour, survei) | P3 |
| INT-11 | Shopping list & order via email | P3 |
| INT-12 | Kuis & pertanyaan | P3 |
| INT-13 | Tabel & chart | P3 |

**Kriteria penerimaan INT:** menambah link ke satu halaman harus bisa selesai dalam **< 15 detik** untuk pengguna baru tanpa membaca dokumentasi.

### 5.6 Analitik

| ID | Kebutuhan | Prio |
|---|---|---|
| ANA-1 | Event ingest terpisah dari API utama, batched, `sendBeacon` saat unload | P1 |
| ANA-2 | Event inti: `view_start`, `page_view` (+durasi), `element_click`, `download`, `share`, `form_submit`, `session_end` | P1 |
| ANA-3 | Overview: total view, pembaca unik, rata-rata waktu, completion rate | P1 |
| ANA-4 | Statistik per halaman: view, waktu tinggal, drop-off | P1 |
| ANA-5 | Lokasi, perangkat, referrer | P2 |
| ANA-6 | Trackable link (UTM-like, per-kanal) | P2 |
| ANA-7 | Laporan lead capture | P2 |
| ANA-8 | Export CSV | P2 |
| ANA-9 | Integrasi Google Analytics & GTM | P2 |
| ANA-10 | Click heatmap per halaman | P3 |
| ANA-11 | Product & revenue analytics | P3 |

**Wajib:** hormati Do-Not-Track, sediakan mode analytics tanpa cookie, dan pastikan jalur data patuh GDPR sejak awal.

### 5.7 Branding

| ID | Kebutuhan | Prio |
|---|---|---|
| BRD-1 | Warna background & tema player | P2 |
| BRD-2 | Logo di player + link ke situs penerbit | P2 |
| BRD-3 | Hapus branding kita (tier berbayar) | P2 |
| BRD-4 | Brand kit: warna, font, logo, favicon | P2 |
| BRD-5 | Custom domain (`publikasi.brandanda.com`) dengan penerbitan TLS otomatis | P3 |
| BRD-6 | Header/footer kustom pada halaman player | P3 |
| BRD-7 | Email ber-branding | P3 |

### 5.8 Akun, tim, billing

| ID | Kebutuhan | Prio |
|---|---|---|
| ACC-1 | Sign up email + OAuth (Google, Microsoft) | P0 |
| ACC-2 | Workspace, undang anggota, role | P2 |
| ACC-3 | Plan & kuota, enforcement batas | P1 |
| ACC-4 | Billing (Stripe): subscription, upgrade, trial 14 hari tanpa kartu | P1 |
| ACC-5 | 2FA (opsional, lalu enforced di tier tim) | P3 |
| ACC-6 | Activity log & usage report | P3 |
| ACC-7 | SSO untuk user (SAML/OIDC) | P3 |

---

## 6. Kebutuhan non-fungsional

| Kategori | Target |
|---|---|
| **Performa player** | LCP < 2 dtk (4G), flip 60fps, bundle < 150KB gzip |
| **Performa konversi** | 50 halaman < 90 dtk p95; halaman 1 siap < 15 dtk |
| **Skalabilitas** | 10.000 pembaca konkuren per publication tanpa degradasi (dijamin CDN) |
| **Ketersediaan** | Player 99,9%. Player harus tetap hidup meski API dashboard mati. |
| **Keamanan** | Enkripsi at-rest & in-transit; signed URL TTL ≤ 5 menit dengan refresh 50 dtk; tidak ada bucket publik |
| **Privasi** | GDPR-ready: data export, hak hapus, residensi data, retensi analytics terkonfigurasi |
| **Aksesibilitas** | WCAG 2.1 AA pada player dan dashboard |
| **SEO** | Halaman publik SSR dengan text layer terekspos sebagai HTML, OG tag, JSON-LD |
| **Browser** | 2 versi terakhir Chrome/Edge/Safari/Firefox; iOS Safari 15+; Android Chrome |
| **Biaya** | Biaya per publication (storage+bandwidth) harus terukur dan terpantau sejak V1 |

---

## 7. Metrik keberhasilan

| Tahap | Metrik | Target |
|---|---|---|
| **Aktivasi** | % pendaftar yang mempublikasikan ≥1 flipbook dalam 24 jam | > 40% |
| **Time-to-wow** | Median detik dari upload → link siap | < 60 dtk |
| **Kualitas player** | Bounce di halaman 1 flipbook publik | < 25% |
| **Engagement** | Rata-rata halaman dibaca per sesi | > 5 |
| **Konversi** | Free → berbayar dalam 30 hari | > 4% |
| **Retensi** | Workspace aktif bulanan (≥1 publish/bulan) | > 60% |
| **Teknis** | Tingkat kegagalan konversi | < 0,5% |

---

## 8. Risiko & mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Kualitas render PDF tidak akurat (font, transparansi, CMYK, PDF/X) | Tinggi — merusak kepercayaan | Pakai engine matang (PDFium/MuPDF), bukan implementasi sendiri. Bangun **suite regresi visual** dengan 30+ PDF sulit sejak Fase 1. |
| Biaya bandwidth membengkak pada publication viral | Tinggi | R2/CDN tanpa biaya egress, kompresi agresif, varian resolusi ketat, alert per-publication. |
| Animasi flip patah di mobile low-end | Tinggi — ini core produk | Uji di perangkat nyata sejak awal; `will-change`, komposit GPU, degradasi otomatis ke efek slide. |
| Storage meledak (3 varian × ribuan halaman) | Sedang | Generate `full` secara lazy on-demand + cache; lifecycle policy untuk publication tidak aktif. |
| Scope creep ke Design Studio | Tinggi — pembunuh jadwal | Dipagari eksplisit ke V4. Overlay Editor ≠ Canvas Editor. |
| Waktu konversi terasa lama | Sedang | Progressive publish + progres real-time + preview halaman 1 lebih dulu. |
| Kepatuhan (GDPR) sebagai afterthought | Sedang | Model data ramah-privasi sejak awal; IP di-hash, bukan disimpan mentah. |

---

## 9. Keputusan & pertanyaan terbuka

### 9.1 Sudah diputuskan (2026-08-15)

| # | Pertanyaan | Keputusan |
|---|---|---|
| 1 | **Design Studio** — bangun editor kanvas? | ❌ **Tidak.** Ganti dengan jalur impor dari Canva/Figma/InDesign. Hemat 6–8 minggu. Lihat §3.3. |

### 9.2 Sengaja ditahan

| # | Pertanyaan | Status |
|---|---|---|
| 2 | **Target pasar awal** — global/Inggris vs Indonesia dulu? Memengaruhi bahasa default, payment gateway (Stripe vs Midtrans/Xendit), residensi data | ⏸️ **Ditahan.** Tidak memblokir Fase 0–1. Wajib diputuskan **sebelum Fase 2 item 2.17 (billing)**. |
| 3 | **Model harga** — meniru struktur mereka, atau menyerang dengan interaktivitas di tier murah | ⏸️ Ditahan. Rekomendasi saya tetap: yang kedua (lihat §2.2). Diputuskan bersama #2. |
| 4 | **Self-host vs cloud** | ⏸️ Ditahan. Berinteraksi dengan ADR-001 — lisensi AGPL akan jadi masalah jauh lebih besar jika produk didistribusikan on-premise. |

### 9.3 Cara menjaga keputusan yang ditahan tetap murah

Karena #2–#4 belum dijawab, implementasi **wajib** menjaga ketiganya tetap reversibel. Ini bukan opsional — mengabaikannya berarti keputusan itu terkunci diam-diam oleh kode:

- **Billing di balik abstraksi `PaymentProvider`.** Jangan panggil SDK Stripe langsung dari logika bisnis. Ganti gateway harus jadi pekerjaan satu package, bukan satu sprint.
- **i18n sejak baris pertama UI.** Tidak ada string yang di-hardcode di JSX, termasuk di marketing site. Default Inggris, tapi kunci terjemahan ada sejak awal.
- **Mata uang & harga sebagai data, bukan konstanta.** Plan, harga, dan mata uang di tabel database, bukan di kode.
- **Region storage & database sebagai konfigurasi.** Tidak ada region yang di-hardcode.
- **ADR-001 harus memilih jalur permisif** (PDFium + pdf.js) kecuali #4 sudah pasti cloud-only. Ini pilihan default yang aman selama on-premise masih mungkin.

**Asumsi kerja sampai ada jawaban:** cloud-only, default Inggris dengan i18n aktif, Stripe sebagai provider pertama di balik abstraksi.

---

## 10. Peta rilis

| Rilis | Isi | Perkiraan |
|---|---|---|
| **V0 — Fondasi** | Monorepo, auth, skema DB, storage, CI | 1–2 minggu |
| **V1 — Core Loop** | Upload → konversi → player (flip) → link publik → embed | 4–5 minggu |
| **V2 — Produk yang bisa dipakai** | Dashboard, sharing lengkap, TOC, search, SEO, billing | 3–4 minggu |
| **V3 — Monetisasi** | Overlay interaktif, analytics, branding, private sharing | 6–8 minggu |
| **V4 — Ekspansi** | Tim & workspace, custom domain, impor Canva/Figma, elemen lanjutan, export | 5–7 minggu |
| **V5 — Enterprise** | SSO, API, otomasi katalog, AI, kepatuhan | Berkelanjutan |

**Definisi MVP yang bisa dijual = akhir V2.** Semua yang di atas V2 adalah tentang menaikkan ARPU, bukan membuktikan produk.

Detail eksekusi per fase ada di [03-ROADMAP.md](03-ROADMAP.md).
