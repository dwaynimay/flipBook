# 04 — Handoff: Tools, Skills & Orkestrasi Agen

**Untuk:** agen yang akan mengeksekusi implementasi
**Baca dulu, berurutan:** [00-RESEARCH.md](00-RESEARCH.md) → [01-PRD.md](01-PRD.md) → [02-ARCHITECTURE.md](02-ARCHITECTURE.md) → [03-ROADMAP.md](03-ROADMAP.md) → dokumen ini

---

## 1. Aturan main untuk agen pelaksana

Delapan aturan ini menjaga proyek tidak melenceng. Langgar satu, dan biaya perbaikannya berlipat.

1. **Jangan pernah memanggil library PDF secara langsung.** Semua akses lewat interface `PdfEngine` di `packages/pdf-engine`. Lisensi engine belum final — abstraksi ini yang menjaga keputusan tetap murah untuk diubah.
2. **Anggaran bundle player adalah hukum.** 150KB gzip. Sebelum menambah dependensi apa pun ke `apps/player`, ukur dampaknya. Jika lewat, jangan tambahkan.
3. **Koordinat elemen selalu fraksi 0–1.** Tidak pernah piksel. Di mana pun.
4. **`PublicationVersion` immutable.** Perubahan konten = versi baru. Jangan pernah mutasi in-place.
5. **Tidak ada objek publik di storage.** Semua akses lewat CDN + signed URL, termasuk publication publik.
6. **Player tidak boleh bergantung pada API dashboard.** Hanya dua endpoint: signature dan ingest analytics.
7. **Regresi visual dijalankan setiap kali menyentuh pipeline render.** Suite `fixtures/pdfs/` adalah jaring pengaman utama proyek ini.
8. **Setiap keputusan arsitektur baru ditulis sebagai ADR** di `docs/adr/`.
9. **Jangan panggil SDK Stripe dari logika bisnis.** Semua lewat `PaymentProvider` di `packages/billing`. Target pasar masih ditahan — kode tidak boleh mengunci keputusan itu diam-diam.
10. **Tidak ada string ter-hardcode di UI mana pun**, termasuk marketing site. Default Inggris, tapi lewat `packages/i18n` sejak baris pertama.
11. **Jangan bangun editor kanvas.** Design Studio sudah dicoret secara resmi. Jika sebuah task terasa mengarah ke sana, berhenti dan konfirmasi.

---

## 2. Skills yang perlu di-install

Diverifikasi lewat `npx skills find`. Jumlah install per 2026-08-15. Prioritaskan yang sumbernya resmi dan install-nya tinggi.

### 2.1 Wajib install

```bash
npx skills add anthropics/skills@frontend-design -g -y
```
777.5K install · sumber resmi Anthropic. Fondasi kualitas UI untuk dashboard, marketing site, dan chrome player.

```bash
npx skills add vercel-labs/agent-skills@vercel-react-best-practices -g -y
```
632.5K install · sumber resmi Vercel. Pola React/Next.js — langsung relevan untuk `apps/web`.

```bash
npx skills add wshobson/agents@nextjs-app-router-patterns -g -y
```
27.2K install. Pola App Router khusus, dipakai berat di dashboard.

### 2.2 Wajib untuk Fase 1 (kualitas animasi flip)

Ini yang menentukan produk terasa premium atau murahan. Jangan lewatkan.

```bash
npx skills add emilkowalski/skills@animation-vocabulary -g -y
npx skills add emilkowalski/skills@review-animations -g -y
```
87.2K & 99.7K install. Emil Kowalski adalah rujukan serius untuk animasi web. `review-animations` khususnya berguna untuk menilai apakah efek flip terasa benar — masalah yang sulit dinilai tanpa kerangka.

```bash
npx skills add heygen-com/hyperframes@css-animations -g -y
```
73.8K install. Teknik CSS animation — inti dari efek flip 3D kita.

```bash
npx skills add greensock/gsap-skills@gsap-react -g -y
```
40.3K install · sumber resmi GreenSock. **Install sebagai referensi teknik, bukan keharusan memakai GSAP.** GSAP menambah berat ke bundle player; evaluasi apakah Web Animations API sudah cukup sebelum memasukkannya.

### 2.3 Kondisional

```bash
# Hanya jika memilih Clerk untuk auth (bukan Better Auth)
npx skills add clerk/skills@clerk-nextjs-patterns -g -y     # 32.8K

# Hanya jika memilih Neon sebagai host Postgres
npx skills add neondatabase/agent-skills@neon-postgres -g -y # 88.6K

# Hanya jika ADR membalik keputusan Drizzle → Prisma
npx skills add prisma/skills@prisma-postgres -g -y           # 170.2K
```

### 2.4 Sengaja TIDAK direkomendasikan

**Skill pemrosesan PDF.** Sudah saya telusuri; yang tersedia install-nya rendah (709, 386, 246, 76 …) dan tidak ada yang dari sumber resmi. Untuk komponen paling kritis di proyek ini, itu tidak cukup. **Gunakan `/find-docs` (Context7) langsung ke dokumentasi resmi MuPDF.js dan PDFium** — sudah saya verifikasi bahwa dokumentasinya lengkap dan mutakhir di sana (`/artifexsoftware/mupdf.js`, 439 snippet, reputasi tinggi).

**Skill testing Playwright.** Yang tertinggi hanya 2.8K install dari sumber tidak dikenal. Pakai skill `engineering:testing-strategy` yang sudah terpasang, plus `/find-docs` untuk API Playwright.

---

## 3. Skills yang SUDAH terpasang & kapan memakainya

Tidak perlu install. Panggil lewat `Skill` tool atau `/nama-skill`.

| Skill | Kapan dipakai |
|---|---|
| **`find-docs`** | ⭐ **Setiap kali** menyentuh library apa pun — Drizzle, Fastify, BullMQ, MuPDF, PDFium, Stripe, Playwright, R2. Wajib, bukan opsional. Pengetahuan model bisa basi. |
| **`claude-mem:make-plan`** | Di awal **setiap fase** — pecah fase roadmap jadi rencana implementasi berfase yang detail |
| **`claude-mem:do`** | Untuk mengeksekusi rencana hasil `make-plan` lewat subagent |
| **`engineering:system-design`** | Fase 0 (desain skema), Fase 3 (arsitektur pipeline analytics) |
| **`engineering:architecture`** | Saat menulis ADR, terutama ADR-001 (pilihan engine PDF) |
| **`engineering:testing-strategy`** | Fase 0 — rancang suite regresi visual sebelum ada kode render |
| **`engineering:code-review`** | Akhir setiap fase |
| **`engineering:debug`** | Saat pipeline konversi bermasalah (akan terjadi) |
| **`design:accessibility-review`** | Fase 2 item 2.15 — target WCAG 2.1 AA |
| **`product-management:write-spec`** | Saat memperluas PRD untuk fitur yang belum terspesifikasi detail |
| **`claude-mem:learn-codebase`** | Saat agen baru masuk ke repo yang sudah berjalan |
| **`graphify`** | Setelah Fase 2 — bangun knowledge graph codebase untuk navigasi cepat |
| **`simplify`** | Setelah fase besar — bersihkan duplikasi sebelum menumpuk |
| **`security-review`** | ⭐ Sebelum Fase 3 rilis — signed URL, password, OTP, akses privat semua rawan |
| **`dataviz`** | Fase 3 — dashboard analytics |
| **`update-config`** | Setup hook & permission repo agar prompt izin berkurang |

---

## 4. Tools & MCP

| Tool | Peran di proyek ini |
|---|---|
| **Claude Browser MCP** (`mcp__Claude_Browser__*`) | ⭐ Kerja keras di sini. Preview `apps/player` selama pengembangan, inspeksi DOM/computed style, baca console & network, uji viewport mobile/tablet/desktop, benchmark ulang terhadap `player.flipsnack.com` saat menyetel rasa animasi. `preview_start` + `.claude/launch.json` untuk dev server. |
| **Context7 CLI** (`npx ctx7@latest`) | Dokumentasi library mutakhir. Sudah terverifikasi memuat MuPDF.js, PDF.js, dan mayoritas stack kita. |
| **Playwright** | E2E + **regresi visual pipeline render**. Aset kualitas terpenting proyek. |
| **`sequential-thinking` MCP** | Untuk masalah bercabang: matematika transform flip 3D, penalaran urutan konkurensi worker. |
| **PowerShell / Bash tool** | Lingkungan Windows — PowerShell 5.1 primer, Bash untuk skrip POSIX. Perhatikan: `&&` tidak ada di PS 5.1. |
| **`.claude/launch.json`** | Konfigurasikan di Fase 0 untuk `web` (3000) dan `player` (5173) agar preview instan. |

### Tools yang TIDAK diperlukan
Canva MCP, bio-research, legal, finance, Zotero, pdf-viewer plugin — tidak relevan. Abaikan.
MCP server yang butuh OAuth (GitHub, Linear, Figma, Slack) belum terotorisasi di sesi ini; otorisasi dulu lewat `claude mcp` atau pengaturan connector jika memang dibutuhkan.

---

## 5. Orkestrasi agen per fase

Bagi pekerjaan berdasarkan **batas artefak**, bukan berdasarkan lapisan. Dua agen yang mengedit file yang sama = konflik.

| Fase | Agen | Cakupan file |
|---|---|---|
| **0** | Satu agen, sekuensial | Seluruh scaffold — pekerjaan fondasi tidak boleh diparalelkan |
| **1A** | Satu agen khusus | `packages/pdf-engine` + `fixtures/` + ADR-001. **Spike terisolasi.** |
| **1B** | Agen "worker" | `apps/worker`, `packages/manifest` |
| **1C** | Agen "player" | `apps/player` — **selalu terpisah**, punya batasan performa sendiri |
| **1D** | Agen "api" | `apps/api`, `packages/db` |
| **2** | 2 agen paralel | (a) dashboard `apps/web` · (b) fitur player `apps/player` |
| **3** | 3 agen paralel | (a) overlay editor `apps/web` · (b) runtime elemen `apps/player` · (c) analytics `apps/api` + `apps/worker` + `packages/analytics` |
| **4+** | Per fitur | Satu agen per fitur vertikal |

**Aturan paralelisasi:** paralelkan hanya jika kedua agen menyentuh direktori `apps/*` yang berbeda. Perubahan pada `packages/db` atau `packages/shared` harus sekuensial — keduanya dipakai semua orang.

Gunakan `EnterWorktree` untuk pekerjaan paralel agar tidak saling menimpa.

---

## 6. Urutan langkah pertama untuk agen pelaksana

Lakukan persis berurutan:

1. Baca keempat dokumen di `docs/` sampai selesai.
2. Install skill di §2.1 dan §2.2.
3. Catat status keputusan di [01-PRD.md §9](01-PRD.md): **Design Studio sudah dicoret** (tidak perlu ditanya lagi). Target pasar, model harga, dan self-host **sengaja ditahan** — jangan blokir pekerjaan karenanya, tapi patuhi §9.3 supaya ketiganya tetap reversibel. Ajukan lagi ke pemilik produk **sebelum Fase 2 item 2.17 (billing)**.
4. Jalankan `claude-mem:make-plan` untuk **Fase 0** saja. Jangan merencanakan seluruh proyek sekaligus.
5. Setup `.claude/launch.json` dan konfigurasi permission lewat `update-config` supaya alur kerja tidak terus-menerus terhenti prompt izin.
6. Eksekusi Fase 0. Verifikasi setiap exit criteria secara eksplisit.
7. **Mulai Fase 1 dengan spike engine PDF (1A).** Ini keputusan berisiko tertinggi — selesaikan lebih dulu, sementara pekerjaan lain berjalan paralel terhadap interface `PdfEngine`.

---

## 7. Peringatan yang paling mudah diabaikan

| Jebakan | Kenapa fatal | Penangkal |
|---|---|---|
| Bangun dashboard sebelum player | Berminggu-minggu kerja tanpa apa pun yang bisa didemokan | Fase 1 mengunci urutan; ikuti |
| Pakai WebGL untuk flip | Kompleksitas besar tanpa manfaat — riset membuktikan Flipsnack tidak memakainya | CSS 3D. Sudah dibuktikan cukup. |
| Tunda regresi visual | Regresi render terdeteksi berbulan-bulan kemudian, saat sudah mahal | Bangun di Fase 0, isi `fixtures/pdfs/` sebelum menulis kode render |
| Lupa lisensi AGPL MuPDF | Bisa mewajibkan pembukaan seluruh source code SaaS Anda | ADR-001 wajib menyelesaikan ini sebelum kode produksi apa pun ditulis |
| Bundle player membengkak | Membunuh kasus penggunaan embed — alasan utama produk ini dibeli | Anggaran ditegakkan di CI sejak Fase 1 |
| Simpan IP mentah di analytics | Pelanggaran GDPR | Hash sejak baris pertama kode analytics |
| Scope creep ke Design Studio | Menggandakan jadwal | ✅ Sudah dicoret permanen. Overlay Editor ≠ Canvas Editor — jangan biarkan yang pertama tumbuh jadi yang kedua |
| Panggil Stripe langsung dari logika bisnis | Mengunci target pasar yang sengaja masih ditahan | `PaymentProvider` di `packages/billing`, tanpa pengecualian |
| Hardcode string Inggris "sementara" | Retrofit i18n jauh lebih mahal daripada memulainya benar | `packages/i18n` aktif sejak komponen UI pertama |
| Merender halaman `full` untuk semua | Biaya storage meledak di dokumen panjang | Lazy-generate + cache |
| Uji animasi hanya di DevTools throttling | Perangkat asli berperilaku sangat berbeda | Uji di iPhone dan Android mid-range fisik |

---

## 8. Batasan legal untuk agen pelaksana

Mereplikasi fungsionalitas dan pola arsitektur: **boleh**. Pasar ini sudah dihuni banyak pemain yang saling menyerupai (Issuu, Heyzine, Publuu, FlippingBook).

Yang **dilarang** selama implementasi:
- Menyalin, men-deobfuscate, atau menurunkan kode dari `reader.gz.js` atau bundle Flipsnack mana pun
- Memakai nama, logo, atau wordmark Flipsnack di produk
- Menyalin teks marketing, template, atau aset desain mereka secara verbatim
- Mengunduh atau meredistribusikan konten pengguna mereka

Yang **boleh**: mempelajari perilaku produk di browser sebagai pengguna biasa, dan menulis implementasi independen dari nol.
