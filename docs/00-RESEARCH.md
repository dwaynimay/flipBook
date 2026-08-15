# 00 — Riset & Teardown Flipsnack

**Tanggal riset:** 2026-08-15
**Metode:** inspeksi live via browser (DOM, computed style, network trace, runtime globals) pada `flipsnack.com`, `player.flipsnack.com`, dan halaman pricing/templates.
**Status:** semua temuan di bawah = hasil observasi langsung, bukan asumsi. Bagian yang masih tebakan ditandai `[ASUMSI]`.

---

## 1. Ringkasan produk

Flipsnack = **SaaS digital publishing**. Inti value prop-nya satu kalimat:

> Upload PDF → jadi flipbook HTML5 interaktif yang bisa di-share, di-embed, dan dilacak analitiknya.

Produk terbagi jadi 4 pilar yang berbeda bobot engineering-nya:

| Pilar | Deskripsi | Bobot |
|---|---|---|
| **Konversi & Player** | PDF → halaman raster → viewer flip 3D | Berat, tapi ini core moat |
| **Interactivity layer** | Overlay elemen (link, video, form, product tag) di atas halaman | Sedang |
| **Design Studio** | Editor kanvas from-scratch (mirip Canva) | Sangat berat |
| **Distribution & Analytics** | Share, embed, private sharing, statistik, branding | Sedang |

Positioning kompetitif (dari footer mereka sendiri): Issuu, FlippingBook, FlipHTML5, Publuu, Heyzine. Klaim traksi: "over 10M people".

---

## 2. Arsitektur yang terobservasi

### 2.1 Pemisahan domain

Flipsnack memecah aplikasinya jadi subdomain terpisah — ini keputusan arsitektur yang sengaja dan layak ditiru:

| Subdomain | Fungsi |
|---|---|
| `www.flipsnack.com` | Marketing site + SEO landing (templates, examples) |
| `app.flipsnack.com` | Dashboard + Design Studio (editor) |
| `auth.flipsnack.com` | Authentication terpisah |
| `player.flipsnack.com` | **Player/reader — aplikasi statis mandiri** |
| `otp.flipsnack.com` | OTP untuk private sharing |
| `content-private.flipsnack.com` | Endpoint penerbit signature CDN |
| `cdn.flipsnack.com` | Aset statis situs |
| 4× CloudFront distribution | `cloudfrontBase`, `cloudfrontContentBase`, `cloudfrontStaticBase`, `cloudfrontPrivate` |

**Insight kunci:** player di-isolasi total dari aplikasi utama. Embed di situs pihak ketiga = `<iframe src="player.flipsnack.com/?hash=...">`. Ini yang bikin embed aman, cepat, dan cacheable.

### 2.2 Teknologi player (temuan terpenting)

```
document.querySelectorAll('canvas').length  →  0
```

**Player TIDAK memakai canvas/WebGL.** Ini mengejutkan tapi terkonfirmasi. Yang ditemukan:

- **React + styled-components.** Nama class jelas mengikuti konvensi styled-components `Component__Element-sc-<hash>-<idx>`:
  - `Stagestyles__StagePagesContainer-sc-llx6uf-2`
  - `EffectFlipstyles__PageContainer-sc-kylv8a-4`
  - `PageBackground__PageDiv-sc-17hm0la-0`
  - `StagePagesPreloaderstyles__PreloaderThumbnail-sc-eioowp-2`
  - `ControllerBarStyles__PageNumberWrapper-sc-nq42hz-8`
  - `PageNumbersstyles__PageNumber-sc-xg3u78-0`
- **Efek flip = DOM + CSS 3D transform**, bukan render 3D. Nama komponen `EffectFlip*` mengindikasikan pola strategy: kemungkinan besar ada juga `EffectSlide` dan `EffectScroll` — sesuai fitur pricing *"Flip, slide & scroll pages"*.
- Bundle player = **satu file**: `player.flipsnack.com/reader.gz.js` (+ `handleUnsupportedBrowsers.gz.js`). Tidak ada code-splitting. Prioritasnya: satu round-trip, langsung jalan.
- Total DOM saat idle sangat ramping (~112 `div`, 9 `button`, 9 `svg`). Bukan aplikasi berat.

**Konsekuensi strategis:** kita **tidak perlu WebGL** untuk mencapai paritas. Ini memangkas risiko teknis terbesar yang biasanya diasumsikan di proyek seperti ini. CSS 3D + `transform-style: preserve-3d` + shadow gradient sudah cukup, dan lebih baik untuk aksesibilitas, SEO, serta text selection.

### 2.3 Pipeline konten

Halaman flipbook disajikan sebagai **gambar raster per halaman**, bukan PDF yang dirender di klien:

```
https://d3u72tnj701eui.cloudfront.net
  /78CBAA5569B                          ← account/tenant id
  /collections/zt82ijkvxn               ← collection id
  /items/afc7f3fb0ddd402a83b07ci145000401   ← item (flipbook) id
  /covers/<uuid-per-halaman>
  /thumb                                 ← varian resolusi
  ?Signature=...&Policy=...&Key-Pair-Id=KKS5Y1MBXEN2R
```

Yang bisa dibaca dari struktur ini:

1. **Hierarki:** `account → collection → item → page asset → variant`.
2. **Varian resolusi eksplisit** (`/thumb`). Player memuat thumbnail dulu lewat komponen `StagePagesPreloader`, lalu upgrade ke resolusi penuh — **progressive loading**.
3. **Semua konten di belakang CloudFront signed URL.** Bukan bucket publik.

### 2.4 Model keamanan konten (patut ditiru persis)

```js
window.cloudfrontPrivate  = "https://d3u72tnj701eui.cloudfront.net";
window.signatureFetchUrl  = "https://content-private.flipsnack.com/authorization";
window.signatureInterval  = "50000";   // 50 detik
```

Player me-refresh signature CDN **setiap 50 detik**. Artinya: URL aset punya TTL pendek, dan hak akses dievaluasi ulang terus-menerus selama sesi baca. Inilah yang membuat fitur *password protected*, *specific people*, *SSO viewer*, dan *deactivate flipbook* benar-benar punya gigi — bukan sekadar UI gate.

Pendukung lain: `otp.flipsnack.com/otp/request-code` (akses via kode), reCAPTCHA v2 + Enterprise (dua site key berbeda).

### 2.5 Ingest telemetri — langsung ke antrian

```js
window.statisticsEndpoint         = "https://sqs.us-east-1.amazonaws.com/756737886395/flip-sts";
window.leadFormEndpoint           = ".../flip-widget-queue";
window.orderEmailEndpoint         = ".../flip-order-email";
window.interactivityElementsEndpoint = ".../...";
```

Player menulis **langsung ke AWS SQS dari browser** — tanpa API server di tengah. Ini keputusan skalabilitas yang agresif: jalur tulis analytics tidak bisa jadi bottleneck dan tidak bisa menjatuhkan API utama. Worker konsumsi queue secara asinkron.

**Untuk kita:** pola "endpoint ingest terpisah + queue + worker" wajib ditiru. Implementasinya tidak harus SQS langsung dari browser (itu punya trade-off kredensial); edge function tipis → queue sudah setara.

### 2.6 Marketing site

Terpisah total, bundle sendiri (`cdn.flipsnack.com/site/dist/*.js`), sarat tracking (GTM, HubSpot, Clarity, Facebook, LinkedIn, Bing, Clickagy, ZoomInfo). Strategi SEO-nya berbasis **volume landing page**: ~20+ kategori template (`/templates/magazines`, `/catalogs`, `/brochures`, …) masing-masing dengan preview flipbook live yang di-embed. Halaman `/developers` ada tapi tergated (`403 — You don't have access`), jadi API mereka Enterprise-only. `[ASUMSI]` REST + API key.

---

## 3. Inventaris fitur lengkap

Diambil verbatim dari tabel perbandingan pricing mereka. Ini jadi backlog mentah kita.

### 3.1 Pembuatan
Upload & merge multi-PDF · buat dari nol + simpan sebagai template · stock photo/video/GIF · opsi aksesibilitas · folder & label · bookshelf virtual · batas ukuran per tier (100 hal/100MB → 500 hal/500MB)

### 3.2 Interaktivitas
Deteksi link otomatis dari anotasi PDF · auto-link dari teks URL · link internal & eksternal · tombol sosial & buy · tabel · caption & tag · **product tag** · **spotlight** (popup gambar) · video YouTube/Vimeo + audio · **lead form** · photo slideshow · chart · upload video & SVG sendiri · **shopping list** · iframe embed (virtual tour, peta, survei) · popup frame (custom code) · kuis · pertanyaan · contact form

### 3.3 Distribusi
Link, email, sosial, QR · download PDF/JPG/PNG/GIF/MP4 · embed · watermark (free tier) · unlisted · SEO meta · password · **download HTML5 untuk self-host** · embed privat · jadwal publish · share ke orang tertentu · access code · **leak-protection watermark**

### 3.4 Pengalaman baca
Flip / slide / scroll · single page view · fullscreen · **pencarian teks di dalam flipbook** · izin download & print · bahasa tooltip · **RTL** · background audio · deteksi & buat TOC otomatis

### 3.5 Branding
Brand kit (font, warna, logo) · edit URL flipbook · warna background · logo pada flipbook & bookshelf · favicon/header/footer kustom · **custom domain** · email ber-branding · template terkunci untuk tim

### 3.6 Keamanan & privasi
Deactivate flipbook · enforced 2FA · pembatasan domain untuk embed · SSO untuk user · share ke reader · share ke SSO viewer

### 3.7 Analitik
Performance overview · statistik per halaman · AI insight · lead capture · lokasi & akses · **product & revenue analytics** · trackable link (50/200) · tracking kuis & form · export data · Google Analytics · **click heatmap**

### 3.8 Tim
Teammate · take over · library upload tim & personal · role & permission · activity log · usage report · multi-team/brand/workspace

### 3.9 Otomasi (pembeda Enterprise)
**Product catalog generator** · deteksi produk via SKU · import dari PIM/ERP · terima order otomatis · import CSV/XLSX · sinkron Google Sheets · otomasi interaksi massal · **API access**

### 3.10 AI
Kredit bulanan (100/250/500) · image-to-video · generate image · AI feed mapping · generate TOC · **terjemahkan seluruh flipbook** · terjemah teks · generate ringkasan untuk aksesibilitas · ekstrak teks untuk aksesibilitas

### 3.11 Integrasi & kepatuhan
Zapier · GTM · HubSpot · Salesforce · MLS · e-commerce
WCAG 2.0 AA · GDPR · ISO 27001 · HIPAA · enkripsi at-rest & in-motion · BCDR

---

## 4. Struktur harga

| Plan | Harga (tahunan) | User | Flipbook | Pembeda |
|---|---|---|---|---|
| Free | $0 | 1 | — | Ada watermark |
| Starter | $16/bln ($192/th) | 1 | 5 | Link, share dasar, download PDF |
| Professional | $38/bln ($456/th) | 1 | 50 | Interaktivitas penuh, password, analytics, embed tanpa watermark |
| Business | $85/bln ($1020/th) | 1 | 100 | Custom domain, branding penuh, private sharing, HTML5 export, Zapier |
| Team/Enterprise | Sales-led | Banyak | — | SSO, API, otomasi, kepatuhan |

**Pembacaan strategis:** gating-nya bukan pada volume, tapi pada **interaktivitas (Pro) dan branding/privasi (Business)**. Melompat $16 → $38 dipicu semata-mata oleh "elemen interaktif + analytics". Itu titik monetisasi sesungguhnya, dan harus jadi prioritas fitur berbayar pertama kita.

---

## 5. Kesimpulan teknis yang mengarahkan strategi

1. **Tidak perlu WebGL.** Paritas visual dicapai dengan CSS 3D. Risiko teknis terbesar ternyata tidak ada.
2. **Render di server, bukan di klien.** PDF → raster multi-resolusi di worker. Klien hanya menampilkan gambar. Ini membuat player ringan dan konsisten lintas browser.
3. **Player harus aplikasi terpisah.** Bundle kecil, statis, tanpa framework server. Ini syarat mutlak untuk embed.
4. **Signed URL berumur pendek + refresh berkala** adalah fondasi seluruh fitur privasi berbayar. Harus masuk arsitektur sejak hari pertama, bukan ditambal belakangan.
5. **Jalur tulis analytics harus terpisah dari API utama.** Endpoint ingest tipis → queue → worker.
6. **Design Studio adalah produk tersendiri.** Jangan disatukan ke dalam scope MVP.

---

## 6. Catatan legal

Mereplikasi **fungsionalitas** dan pola arsitektur adalah sah — tidak ada monopoli atas ide "PDF jadi flipbook", dan pesaingnya (Issuu, Heyzine, Publuu) memang hidup berdampingan. Yang tidak boleh disalin: nama/logo/wordmark Flipsnack, teks marketing verbatim, aset desain & template mereka, dan kode sumber mereka (termasuk hasil de-minify `reader.gz.js`).

Semua riset di dokumen ini bersifat **behavioral black-box** — inspeksi DOM, network, dan runtime config yang memang terekspos publik. Tidak ada kode yang di-dekompilasi atau disalin. Implementasi wajib ditulis independen dari nol.
