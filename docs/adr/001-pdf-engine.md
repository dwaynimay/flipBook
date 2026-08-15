# ADR-001 — Engine PDF

**Status:** Sementara (provisional) — menunggu spike penuh
**Tanggal:** 2026-08-15

## Konteks

Pipeline konversi butuh empat kemampuan dari PDF: render halaman ke raster, ekstraksi teks, ekstraksi anotasi link, dan pembacaan outline. Pilihan engine adalah keputusan paling mahal untuk dibalik, dan lisensinya berinteraksi dengan pertanyaan self-host yang masih ditahan ([01-PRD.md §9.2](../01-PRD.md)).

## Keputusan

Untuk vertical slice Fase 1, dipakai **jalur permisif**:

| Kebutuhan | Library | Lisensi |
|---|---|---|
| Render halaman | PDFium via `@hyzyla/pdfium` | BSD-3-Clause (PDFium) / MIT (wrapper) |
| Ekstraksi teks | PDFium — `page.getText()` | sama |
| Anotasi link | pdf.js — `page.getAnnotations()` | Apache-2.0 |
| Outline | pdf.js — `doc.getOutline()` | Apache-2.0 |
| Encoding gambar | sharp | Apache-2.0 |

MuPDF ditolak untuk sekarang: secara teknis paling unggul (satu library menutup keempat kebutuhan) tapi berlisensi **AGPL-3.0**, yang untuk SaaS berarti copyleft jaringan — dan jadi masalah jauh lebih besar lagi jika produk didistribusikan on-premise. Selama pertanyaan self-host belum dijawab, jalur permisif adalah default yang aman.

Semua akses melewati interface `PdfEngine` di `packages/pdf-engine`. Tidak ada kode di luar package itu yang mengimpor library PDF secara langsung.

## Hasil sejauh ini

Diuji pada PDF A4 12 halaman berisi teks, blok warna, dan anotasi link:

- Konversi 12 halaman × 3 varian resolusi: **2,2 detik**
- Ekstraksi link: **11/11 terdeteksi**, koordinat ternormalisasi benar (termasuk pembalikan sumbu Y dari sistem koordinat PDF)
- Akurasi warna: terverifikasi lewat pembacaan piksel

## Catatan: urutan kanal warna

Konstanta di sumber `@hyzyla/pdfium` menyebut `FPDFBitmap.BGRA`, dan wrapper meneruskan buffer apa adanya ke fungsi render. Itu mengesankan buffer perlu ditukar B↔R sebelum diserahkan ke sharp, yang membaca raw 4-kanal sebagai RGBA.

**Kesan itu salah untuk build WASM ini.** Diverifikasi dengan membaca piksel dari halaman uji berblok merah/hijau/biru:

| | blok MERAH terbaca |
|---|---|
| Tanpa penukaran | `rgb(218,38,38)` ✅ sesuai sumber `rgb(217,38,38)` |
| Dengan penukaran | `rgb(37,38,218)` ❌ jadi biru |

Buffer diteruskan apa adanya. Halaman uji di `fixtures/make-test-pdf.mjs` sengaja memuat blok warna berlabel supaya regresi ini terlihat dalam sekali pandang.

## Yang masih harus dikerjakan sebelum status ini final

Spike penuh sesuai [03-ROADMAP.md Fase 1A](../03-ROADMAP.md): jalankan **30+ PDF sulit** (font tertanam & subset, CJK, RTL, transparansi & blend mode, CMYK, PDF/X, form field, terenkripsi, rusak, 500 halaman) lewat jalur ini dan bandingkan dengan MuPDF pada akurasi visual, kecepatan, dan penggunaan memori. Baru setelah itu status ADR ini bisa naik dari *sementara* menjadi *diterima*.

Bila hasilnya menunjukkan celah fidelitas yang nyata pada dokumen publishing kelas atas, opsi berbayar tetap terbuka: lisensi komersial MuPDF dari Artifex — yang juga menyederhanakan kode karena keempat kebutuhan tertutup satu library.
