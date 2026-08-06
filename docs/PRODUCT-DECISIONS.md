# Product Decision Log

## Interactive Digital Booklet Learning Platform

| Metadata | Nilai |
| --- | --- |
| Status | Approved |
| Decision | GOV-002 |
| Tanggal persetujuan | 6 Agustus 2026 |

Dokumen ini mengunci keputusan produk yang sebelumnya ambigu pada baseline MVP.
Keputusan berlaku sampai diubah melalui keputusan Product Owner yang tercatat.

## Keputusan Scope MVP

| Area | Keputusan MVP | Batas yang tetap berlaku |
| --- | --- | --- |
| Reset password/account recovery | **Deferred** | MVP menyediakan login, refresh session, dan logout, tetapi tidak menyediakan jalur pemulihan akun. Admin tidak boleh melihat, membagikan, atau menetapkan password pengguna secara manual. Akun tanpa kredensial valid hanya dapat dipulihkan setelah implementasi recovery yang tervalidasi, diaudit, dan disetujui melalui perubahan PRD/ADR. |
| Search | **Deferred** | Filter kategori dasar dan navigasi daftar isi tetap termasuk MVP; pencarian teks global, `pg_trgm`, dan command search tidak termasuk. |
| Riwayat notifikasi persisten | **Deferred** | Reminder aktif, status permission, due reminder pada dashboard, dan feedback in-app tetap termasuk. MVP tidak menyediakan inbox atau histori notifikasi persisten. |
| PDF | **Deferred** | Impor PDF, block/embed PDF, dan PDF sebagai jalur baca tidak termasuk. Konten MVP memakai block terstruktur dan media yang disetujui. |
| Dark mode | **Deferred** | MVP memakai tema terang yang seluruh warnanya berasal dari design token, memenuhi kontras WCAG, dan tidak memakai magic color di feature code. Token tidak boleh menghambat penambahan dark mode setelah MVP. |
| Deployment | **Locked baseline** | `apps/web` dan `apps/admin` dibangun sebagai static Vite assets; `apps/api` sebagai container NestJS; PostgreSQL managed; object storage S3-compatible yang direview. Provider, region, backup, restore, rollback, TLS, dan secret manager harus dipilih serta diverifikasi sebelum release. Kubernetes bukan kebutuhan MVP. |
| Error tracking | **Provider-neutral boundary now** | Structured logging, stable error code, correlation ID, redaction, dan typed observability boundary dibuat pada foundation. Vendor error tracking dipilih sebelum production melalui dependency, privacy, security, region, retention, dan license review. |

## Retention Baseline

Prinsipnya adalah mengumpulkan data minimum, membatasi akses berdasarkan peran,
dan menghapus atau menganonimkan data segera setelah tujuan pemrosesan berakhir.

| Kategori data | Retention engineering baseline |
| --- | --- |
| Refresh session dan artefak autentikasi | Sampai expired atau revoked, lalu dihapus paling lambat 30 hari. Secret/token mentah tidak disimpan di log. |
| Profile, progress, quiz attempt, reminder schedule, dan adherence | Selama akun aktif dan dibutuhkan untuk fitur yang diminta pengguna. Setelah permintaan penghapusan terverifikasi, hapus atau anonimisasi paling lambat 30 hari, kecuali legal/security hold yang terdokumentasi. |
| Raw analytics event | Maksimal 90 hari; metadata harus terbatas dan tervalidasi. |
| Statistik agregat anonim | Maksimal 12 bulan dan tidak boleh dapat direidentifikasi secara wajar. |
| Security dan audit log | Maksimal 90 hari, dengan akses terbatas dan redaction wajib. |
| Upload yatim yang belum dikaitkan | Dihapus paling lambat 24 jam setelah dinyatakan yatim. |
| Backup production | Rolling maksimum 30 hari; data yang dihapus keluar dari backup melalui expiry paling lambat 30 hari dan tidak boleh dipulihkan kembali ke sistem aktif tanpa menerapkan deletion ledger. |

Sebelum production, Product Owner wajib mendapatkan review legal/privacy untuk
tujuan pemrosesan, dasar pemrosesan/consent, pemberitahuan privasi, hak akses dan
penghapusan, lokasi provider, DPA, backup erasure, serta proses insiden. Review
tersebut boleh memperpendek retention; perpanjangan memerlukan alasan, owner,
dan keputusan tertulis.

Rujukan regulasi resmi:

- Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi:
  https://peraturan.bpk.go.id/Details/229798/uu-no-27-tahun-
- Peraturan Pemerintah Nomor 71 Tahun 2019 tentang Penyelenggaraan Sistem dan
  Transaksi Elektronik:
  https://jdih.komdigi.go.id/produk_hukum/view/id/695/t/peraturan%20pemerintah%20nomor%2071%20tahun%202019

Dokumen ini adalah kebijakan engineering, bukan nasihat hukum.

## Change Control

Fitur deferred hanya boleh masuk MVP melalui perubahan PRD/decision log yang
menjelaskan acceptance criteria, pemilik data, dampak security/privacy,
dependency, serta quality gates. Keputusan deployment provider dan error
tracking vendor tetap memerlukan bukti review sebelum production karena
menyangkut sistem eksternal dan data pengguna.
