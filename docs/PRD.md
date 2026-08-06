# Product Requirements Document

## Interactive Digital Booklet Learning Platform

| Metadata | Nilai |
| --- | --- |
| Versi | 2.1 |
| Status | Approved Baseline |
| Tanggal | 28 Juli 2026 |
| Tanggal persetujuan | 30 Juli 2026 |
| Pembaruan scope GOV-002 | 6 Agustus 2026 |
| Bahasa produk | Bahasa Indonesia |
| Produk awal | Edukasi Anemia dan Tablet Tambah Darah (TTD) |
| Platform | Web responsif |

## 1. Ringkasan Eksekutif

Interactive Digital Booklet Learning Platform adalah platform pembelajaran berbasis web yang menyajikan materi edukasi sebagai booklet interaktif dengan efek membalik halaman. Produk menggabungkan bacaan, gambar, video, mitos/fakta, kuis kontekstual, reminder minum TTD, kalender kepatuhan, dan progres belajar.

Inspirasi pengalaman membaca berasal dari Flipsnack, tetapi produk ini bukan clone penuh. Fokusnya adalah pengalaman belajar terarah untuk edukasi kesehatan: ringan, mudah dipahami, dapat dikelola admin, dan dapat digunakan kembali untuk topik selain anemia.

Keputusan produk untuk MVP:

- Pengguna dapat membaca sebagai guest.
- Akun pengguna diperlukan untuk sinkronisasi progres, reminder, dan kalender antarperangkat.
- Admin memiliki aplikasi terpisah untuk mengelola dan menerbitkan konten.
- Konten halaman disimpan sebagai JSON berversi, bukan HTML mentah.
- Booklet yang diterbitkan menggunakan revision/snapshot agar perubahan editor tidak merusak sesi baca aktif.
- Reminder browser pada MVP bersifat best-effort. Aplikasi tidak menjanjikan notifikasi ketika browser dan aplikasi sepenuhnya ditutup.
- Reset password, pencarian teks global, riwayat notifikasi persisten, dukungan PDF, dan dark mode ditunda setelah MVP sesuai `PRODUCT-DECISIONS.md`.

## 2. Latar Belakang dan Masalah

Materi edukasi yang hanya berupa PDF atau halaman teks memiliki beberapa kelemahan:

- keterlibatan pembaca rendah;
- multimedia tidak menyatu dengan alur membaca;
- tidak ada evaluasi pemahaman;
- tidak ada pencatatan progres dan kepatuhan minum TTD;
- admin sulit memperbarui konten tanpa membuat ulang dokumen;
- tidak ada data sederhana untuk menilai efektivitas materi.

Platform ini menyelesaikan masalah tersebut melalui pengalaman belajar yang menyerupai booklet cetak, tetapi interaktif dan terukur.

## 3. Visi Produk

Menjadi platform reusable untuk membuat dan menyampaikan booklet pembelajaran interaktif yang menarik, mudah dikelola, aman, dan terukur.

## 4. Sasaran

### 4.1 Sasaran Pengguna

- Materi inti dapat dipahami melalui sesi baca singkat.
- Pengguna dapat melanjutkan dari halaman terakhir.
- Kuis muncul pada konteks yang tepat tanpa mengganggu navigasi.
- Pengguna dapat mencatat kepatuhan minum TTD secara sederhana.
- Pengguna dapat mengakses konten dengan baik di ponsel, tablet, dan desktop.

### 4.2 Sasaran Administrator

- Admin dapat menyusun booklet tanpa menulis kode.
- Admin dapat melakukan preview sebelum publish.
- Admin dapat mengelola video, mitos/fakta, kuis, dan reminder dari satu panel.
- Admin dapat melihat statistik dasar penggunaan dan pembelajaran.

### 4.3 Sasaran Teknis

- Domain flipbook, konten, kuis, dan reminder memiliki batas modul yang jelas.
- Schema konten dapat ditambah tanpa migrasi data besar untuk setiap tipe block baru.
- Frontend admin dan web berbagi komponen serta kontrak data, tetapi dapat dibangun dan dirilis secara independen.
- Arsitektur MVP tetap berupa modular monolith agar cepat dikembangkan.

## 5. Non-Goals

Hal berikut tidak termasuk MVP:

- clone seluruh fitur bisnis atau design studio Flipsnack;
- impor PDF otomatis menjadi halaman editable;
- editor desain bebas seperti Canva;
- kolaborasi real-time multi-editor;
- version history lengkap dan branching konten;
- aplikasi Android/iOS native;
- PWA offline penuh;
- WhatsApp, SMS, atau email reminder;
- AI summary dan AI question generator;
- leaderboard, badge, sertifikat, atau marketplace template;
- multi-tenant SaaS dan billing;
- diagnosis, konsultasi, atau rekomendasi medis personal.

## 6. Persona dan Hak Akses

### 6.1 Learner/Guest

Guest dapat:

- membuka katalog booklet publik;
- membaca booklet;
- menonton video;
- membuka mitos/fakta;
- mengerjakan kuis;
- menyimpan posisi baca secara lokal pada perangkat.

Guest tidak mendapat sinkronisasi lintas perangkat.

### 6.2 Learner Terautentikasi

Learner terautentikasi mendapat seluruh kemampuan guest, ditambah:

- progres tersimpan di server;
- reminder personal;
- kalender kepatuhan TTD;
- riwayat dan hasil kuis;
- ringkasan progres pembelajaran.

### 6.3 Administrator

Admin dapat:

- masuk ke panel admin;
- mengelola booklet, chapter, page, block, media, video, kuis, dan mitos/fakta;
- mengatur trigger kuis;
- melakukan preview, publish, unpublish, dan archive;
- melihat statistik sederhana.

Role `EDITOR` disiapkan pada model otorisasi, tetapi UI dan workflow approval editor berada di luar MVP.

## 7. Alur Utama Pengguna

### 7.1 Alur Membaca

1. Pengguna membuka landing page.
2. Pengguna memilih booklet.
3. Sistem menampilkan detail booklet dan estimasi waktu.
4. Pengguna memilih “Mulai” atau “Lanjutkan”.
5. Reader membuka posisi terakhir yang valid.
6. Pengguna membalik halaman, memakai daftar isi, atau navigasi thumbnail.
7. Media pada halaman dapat diputar tanpa memicu page flip.
8. Pada trigger tertentu, kuis muncul sebagai dialog.
9. Setelah selesai, progres diperbarui.

### 7.2 Alur Kepatuhan TTD

1. Pengguna login.
2. Pengguna menentukan hari dan jam reminder.
3. Sistem meminta izin notifikasi setelah aksi eksplisit pengguna.
4. Pada waktu yang sesuai, sistem menampilkan reminder best-effort dan fallback in-app.
5. Pengguna mencatat “Sudah”, “Belum”, atau “Lewati”.
6. Kalender, streak, dan persentase kepatuhan diperbarui.

### 7.3 Alur Publikasi Admin

1. Admin membuat booklet berstatus `DRAFT`.
2. Admin membuat chapter dan page.
3. Admin menyusun page dengan block editor.
4. Sistem memvalidasi schema, referensi media, dan overflow halaman.
5. Admin melihat preview reader.
6. Admin menerbitkan revision.
7. Revision yang diterbitkan menjadi snapshot read-only bagi learner.

## 8. Ruang Lingkup Fungsional MVP

### FR-01 Authentication dan Session

Kebutuhan:

- login email dan password untuk admin dan learner;
- logout;
- refresh session yang aman;
- forgot/reset password ditunda ke rilis setelah MVP;
- rate limiting untuk endpoint login;
- role-based access untuk endpoint admin.

Kriteria penerimaan:

- password tidak pernah disimpan sebagai plain text;
- token/session tidak disimpan di `localStorage`;
- akses admin ditolak untuk learner dan guest;
- logout membatalkan refresh session.

### FR-02 Landing, Katalog, dan Detail Booklet

Kebutuhan:

- landing page singkat;
- daftar booklet berstatus `PUBLISHED`;
- filter kategori dasar;
- detail berisi judul, deskripsi, cover, author, estimasi durasi, dan progress.

Kriteria penerimaan:

- draft tidak dapat dibaca melalui URL publik;
- booklet dapat dibuka dari ponsel tanpa horizontal overflow;
- cover memiliki alt text.

### FR-03 Booklet dan Content Management

Kebutuhan admin:

- CRUD booklet;
- CRUD chapter;
- CRUD page;
- urut ulang chapter dan page;
- status `DRAFT`, `PUBLISHED`, `UNPUBLISHED`, `ARCHIVED`;
- preview revision draft;
- publish sebagai snapshot.

Kriteria penerimaan:

- urutan menggunakan nilai eksplisit dan tidak bergantung pada waktu pembuatan;
- publish gagal jika schema page tidak valid atau media wajib hilang;
- pembaca aktif tetap melihat revision yang sama selama sesi.

### FR-04 Block Editor

Tipe block MVP:

- heading;
- paragraph;
- image;
- video;
- callout;
- quote;
- button/link;
- divider;
- myth-fact;
- quiz trigger.

Tipe block setelah MVP:

- audio;
- carousel;
- gallery;
- PDF/embed;
- checklist;
- data table.

Kebutuhan:

- tambah, edit, hapus, duplicate, dan reorder block;
- validasi per tipe block;
- preview halaman;
- undo/redo lokal selama sesi edit;
- autosave draft dengan debounce;
- indikator `saving`, `saved`, dan `error`;
- deteksi konten melebihi tinggi halaman.

Kriteria penerimaan:

- JSON tidak valid tidak dapat dipublish;
- block tidak dikenal ditampilkan sebagai fallback aman, bukan membuat reader crash;
- reorder tidak mengubah ID block;
- HTML atau URL berbahaya tidak dieksekusi.

### FR-05 Flipbook Reader

Kebutuhan:

- efek page flip;
- hard cover dan soft inner page;
- mode dua halaman pada layar lebar;
- mode satu halaman pada layar kecil;
- tombol sebelumnya/berikutnya;
- swipe;
- keyboard navigation;
- daftar isi;
- thumbnail navigation;
- fullscreen;
- zoom terbatas;
- posisi baca otomatis;
- alternatif “mode baca” tanpa animasi.

Kriteria penerimaan:

- klik tombol, link, video, dan kontrol interaktif tidak membalik halaman;
- perubahan orientasi mempertahankan halaman logis saat ini;
- nomor halaman yang disimpan merujuk pada ID page, bukan hanya indeks;
- semua fungsi utama dapat dipakai tanpa mouse;
- `prefers-reduced-motion` dapat mengurangi/menonaktifkan animasi;
- kegagalan engine flip tidak menghilangkan isi; sistem fallback ke mode baca vertikal.

### FR-06 Video dan Materi Singkat

Kebutuhan:

- video dari file storage atau YouTube embed yang diizinkan;
- thumbnail, judul, deskripsi, kategori, dan durasi;
- play, pause, resume, dan fullscreen;
- progress video untuk learner login;
- materi singkat berbasis text, image, infographic, video, atau link ke booklet.

Kriteria penerimaan:

- media di-lazy-load;
- video tidak autoplay dengan suara;
- progress tidak mengirim event berlebihan ke API;
- embed hanya berasal dari provider allowlist.

### FR-07 Mitos vs Fakta

Kebutuhan:

- card berisi pernyataan mitos, fakta, penjelasan, kategori, dan sumber opsional;
- interaksi reveal;
- CRUD admin;
- dapat dipakai sebagai halaman mandiri atau block di booklet.

Kriteria penerimaan:

- label “Mitos” dan “Fakta” tidak hanya dibedakan oleh warna;
- sumber dapat dibuka jika tersedia;
- card draft tidak tampil publik.

### FR-08 Quiz Kontekstual

Jenis soal MVP:

- multiple choice;
- true/false;
- image question dengan pilihan jawaban.

Kebutuhan:

- quiz manual dari menu;
- popup otomatis setelah page yang dikonfigurasi selesai dibaca;
- score, jawaban benar, penjelasan, dan retry;
- trigger hanya sekali per revision per learner kecuali pengguna memilih retry;
- setelah dialog ditutup, pembaca kembali ke page yang sama.

Kriteria penerimaan:

- penilaian tidak mempercayai score yang dihitung klien;
- jawaban dapat dipilih dengan keyboard;
- hasil tetap tercatat meskipun pengguna mendapat nilai 0;
- popup tidak muncul di tengah animasi flip.

### FR-09 Reminder TTD

Kebutuhan:

- aktif/nonaktif reminder;
- pilih hari dan jam lokal;
- timezone pengguna;
- permintaan izin browser notification setelah tindakan pengguna;
- fallback reminder di dashboard;
- catat `TAKEN`, `MISSED`, atau `SKIPPED`.

Kriteria penerimaan:

- status permission `default`, `granted`, dan `denied` ditampilkan dengan jelas;
- jika permission ditolak, fitur kalender tetap berfungsi;
- perubahan timezone tidak menggandakan reminder;
- UI menjelaskan bahwa browser notification MVP tidak dijamin saat browser ditutup.

### FR-10 Kalender Kepatuhan

Kebutuhan:

- tampilan kalender bulanan;
- status harian;
- streak;
- persentase kepatuhan pada rentang terpilih;
- koreksi catatan pada hari yang diizinkan.

Definisi:

`adherence = TAKEN / (TAKEN + MISSED) × 100%`

`SKIPPED` tidak masuk denominator dan harus tampil terpisah.

Kriteria penerimaan:

- tanggal dihitung berdasarkan timezone pengguna;
- tidak ada dua catatan aktif untuk schedule dan tanggal lokal yang sama;
- streak dan persentase menggunakan definisi yang konsisten di API dan UI.

### FR-11 Progress Learning

Kebutuhan:

- halaman terakhir;
- persentase halaman selesai;
- video selesai;
- quiz selesai;
- ringkasan booklet selesai;
- resume learning.

Definisi MVP:

- page dianggap selesai setelah menjadi page aktif dan terlihat minimal 3 detik;
- video dianggap selesai pada 90% durasi;
- booklet dianggap selesai jika seluruh page wajib selesai dan quiz wajib telah disubmit.

Kriteria penerimaan:

- event bersifat idempotent;
- progress tidak berkurang karena pengguna membuka page sebelumnya;
- perubahan jumlah page pada revision baru tidak mengubah histori revision lama.

### FR-12 Admin Analytics Dasar

Metrik:

- jumlah learner;
- jumlah booklet view;
- unique reader per booklet;
- completion rate booklet;
- quiz completion dan average score;
- jumlah catatan TTD `TAKEN` dan adherence agregat anonim;
- average reading session duration.

Kriteria penerimaan:

- admin dapat memilih rentang tanggal;
- data kesehatan personal tidak ditampilkan pada tabel analytics umum;
- definisi setiap metrik tersedia di UI atau dokumentasi.

## 9. Information Architecture

### Aplikasi Learner

- Landing
- Katalog Booklet
- Detail Booklet
- Reader
- Video & Materi
- Mitos vs Fakta
- Quiz
- Reminder TTD
- Kalender
- Progress
- Profile

### Aplikasi Admin

- Dashboard
- Booklet
- Chapters & Pages
- Block Editor
- Media
- Video & Materi
- Mitos vs Fakta
- Quiz
- Users
- Analytics
- Settings

## 10. Model Domain Konseptual

Entitas utama:

- `User`
- `Role`
- `Session`
- `Booklet`
- `BookletRevision`
- `Chapter`
- `Page`
- `PageContent`
- `MediaAsset`
- `LearningMaterial`
- `MythFact`
- `Quiz`
- `Question`
- `QuestionOption`
- `QuizTrigger`
- `QuizAttempt`
- `ReminderSchedule`
- `AdherenceLog`
- `ReadingProgress`
- `VideoProgress`
- `AnalyticsEvent`
- `Category`
- `Tag`

Relasi penting:

- satu booklet memiliki banyak revision;
- satu revision memiliki chapter dan page yang immutable setelah publish;
- satu page memiliki satu dokumen konten JSON berversi;
- block mereferensikan media/quiz/myth-fact melalui ID, bukan menyalin seluruh record;
- progress selalu menyimpan `revisionId` dan `pageId`;
- adherence log terkait learner, schedule, dan tanggal lokal.

## 11. Kontrak Konten JSON

Contoh konseptual:

```json
{
  "schemaVersion": 1,
  "pageId": "page_01",
  "layout": {
    "preset": "portrait",
    "background": "#FFFFFF"
  },
  "blocks": [
    {
      "id": "block_01",
      "type": "heading",
      "version": 1,
      "props": {
        "level": 1,
        "text": "Kenali Anemia"
      }
    },
    {
      "id": "block_02",
      "type": "video",
      "version": 1,
      "props": {
        "mediaId": "media_123",
        "caption": "Apa itu anemia?"
      }
    }
  ]
}
```

Aturan:

- dokumen memiliki `schemaVersion`;
- setiap block memiliki `id`, `type`, `version`, dan `props`;
- schema divalidasi pada client dan server;
- migrator mengubah schema versi lama ke versi reader saat ini;
- renderer tidak menerima komponen atau kode JavaScript dari JSON;
- nilai style dibatasi oleh design token/preset yang diizinkan;
- published revision menyimpan snapshot JSON;
- unknown block memakai fallback yang aman dan tercatat pada observability.

## 12. Persyaratan Non-Fungsional

### Performance

- Largest Contentful Paint landing pada koneksi mobile target ≤ 2,5 detik pada persentil ke-75.
- Interaksi navigasi reader target ≤ 200 ms di luar durasi animasi.
- Media di-lazy-load dan image memiliki ukuran responsif.
- Autosave tidak lebih sering dari satu request per 1,5 detik selama edit aktif.
- MVP merekomendasikan maksimal 60 page per booklet dan maksimal 10 MB media awal per page.

### Reliability

- API health check tersedia.
- Operasi publish menggunakan transaksi.
- Event progress dan analytics idempotent atau memiliki deduplication key.
- Backup database dan object storage didefinisikan sebelum production.

### Security

- TLS/HTTPS wajib di production.
- Password di-hash dengan Argon2id.
- Refresh session memakai cookie `HttpOnly`, `Secure`, dan kebijakan `SameSite` yang sesuai.
- Validasi input dilakukan di boundary API.
- Upload memakai allowlist MIME, batas ukuran, nama object acak, dan scan malware bila masuk production.
- Rich text disanitasi.
- Endpoint admin memakai RBAC dan audit log minimal untuk publish/delete.
- Secret hanya berasal dari environment/secret manager.

### Privacy

- Data reminder dan kepatuhan diperlakukan sebagai data sensitif.
- Hanya data yang dibutuhkan yang dikumpulkan.
- Analytics produk tidak menyimpan isi jawaban atau data kesehatan lebih dari yang diperlukan.
- Pengguna dapat melihat dan menghapus data personal sesuai kebijakan produk.
- Produk menyertakan disclaimer bahwa konten bersifat edukasi, bukan diagnosis medis.

### Accessibility

- Target WCAG 2.2 level AA untuk alur utama.
- Reader memiliki mode vertikal non-animasi.
- Semua kontrol memiliki accessible name.
- Fokus keyboard terlihat.
- Dialog kuis mengelola focus trap dan mengembalikan fokus setelah ditutup.
- Gambar konten mewajibkan alt text atau penanda dekoratif.
- Warna bukan satu-satunya indikator status.

### Compatibility

- Dua versi mayor terbaru Chrome, Edge, Firefox, dan Safari.
- Layout minimum 360 px.
- Touch, mouse, dan keyboard didukung.

### Observability

- structured logging pada API;
- error tracking frontend dan backend;
- request/correlation ID;
- metrik error rate, latency, dan publish failure;
- audit event untuk perubahan status publikasi.

## 13. Metrik Keberhasilan

Target pilot yang dapat disesuaikan setelah baseline:

- ≥ 70% learner yang memulai booklet menyelesaikan minimal 75% page;
- ≥ 60% learner menyelesaikan quiz yang terpicu;
- ≥ 80% sesi reader dapat dilanjutkan dari posisi terakhir tanpa error;
- ≥ 50% learner login yang mengaktifkan reminder mencatat kepatuhan minimal sekali;
- publish success rate admin ≥ 99%;
- crash-free reader sessions ≥ 99,5%.

## 14. Event Analytics Minimum

- `booklet_opened`
- `reading_session_started`
- `page_viewed`
- `media_started`
- `media_completed`
- `quiz_triggered`
- `quiz_submitted`
- `booklet_completed`
- `reminder_enabled`
- `adherence_recorded`

Setiap event minimum memiliki:

- `eventId`;
- timestamp server;
- anonymous/user ID sesuai consent;
- `bookletId` dan `revisionId` bila relevan;
- metadata terbatas dan tervalidasi.

## 15. Tahapan Delivery

### Phase 0 — Foundation

- dokumentasi arsitektur;
- monorepo;
- quality gates;
- kontrak content schema;
- local infrastructure;
- CI dasar.

### Phase 1 — Vertical Slice Reader

- admin login;
- CRUD booklet/page minimal;
- heading, paragraph, image;
- publish revision;
- reader page flip dan fallback vertical;
- posisi baca.

### Phase 2 — Interactive Learning

- video;
- myth/fact;
- quiz dan trigger;
- progress.

### Phase 3 — TTD Adherence

- learner login;
- reminder;
- kalender;
- adherence metrics.

### Phase 4 — Hardening

- accessibility audit;
- performance;
- security;
- analytics dashboard;
- backup/restore rehearsal;
- UAT.

## 16. Definition of Done MVP

MVP selesai jika:

- seluruh acceptance criteria prioritas MVP lulus;
- admin dapat membuat dan menerbitkan booklet tanpa perubahan kode;
- learner dapat menyelesaikan alur booklet → video → quiz → progress;
- learner login dapat mengaktifkan reminder dan mencatat kepatuhan;
- reader berfungsi di ponsel dan desktop;
- mode baca vertikal tetap berfungsi ketika animasi flip dinonaktifkan/gagal;
- tidak ada temuan security severity tinggi yang terbuka;
- backup, restore, deployment, dan rollback terdokumentasi;
- UAT dengan konten anemia/TTD selesai.

## 17. Risiko Produk dan Mitigasi

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Efek flip mengganggu kontrol video/quiz | Tinggi | Pisahkan adapter flip, forward event interaktif, dan sediakan vertical mode |
| Konten melebihi ukuran page | Tinggi | Overflow validator, preview pada breakpoint, batas layout MVP |
| Browser notification tidak konsisten | Tinggi | Permission UX, in-app fallback, jelaskan batas MVP, web push pada roadmap |
| Schema JSON berubah | Tinggi | `schemaVersion`, block version, migrator, snapshot revision |
| Over-engineering monorepo | Sedang | Modular monolith, paket hanya untuk boundary reusable nyata |
| Progress rusak saat konten berubah | Tinggi | Ikat progress ke `revisionId` dan `pageId` |
| Data kepatuhan bersifat sensitif | Tinggi | Data minimization, RBAC, audit, agregasi anonim |
| Library flip tidak aktif dikembangkan | Tinggi | Bungkus dalam adapter, contract test React 19, siapkan fallback StPageFlip/vertical reader |

## 18. Referensi

- Flipsnack product experience: https://www.flipsnack.com/
- React 19: https://react.dev/versions
- `react-pageflip`: https://github.com/Nodlik/react-pageflip
- StPageFlip: https://github.com/Nodlik/StPageFlip
- pnpm workspace: https://pnpm.io/workspaces
- NestJS workspace: https://docs.nestjs.com/cli/monorepo
- Prisma pnpm workspace guide: https://docs.prisma.io/docs/guides/deployment/pnpm-workspaces
