# Product Owner Approval Record

| Tanggal | Scope | Keputusan | Evidence |
| --- | --- | --- | --- |
| 30 Juli 2026 | GOV-001 baseline documents and Foundation Batch FND-001–FND-006 | Approved for execution | Product Owner instruction: “oke lets cook” |
| 31 Juli 2026 | FND-007 and ADR-008 local MinIO license exception | Approved for execution | Product Owner explicitly approved MinIO GNU AGPLv3 for local development and authorized the license record and ADR |
| 31 Juli 2026 | FND-007 exact-pinned PostgreSQL and MinIO container-image CVE risk | Accepted temporarily for loopback-only local development; Product Owner is the risk owner; review no later than 31 August 2026 or when a newer official image becomes available | Product Owner approval (verbatim): “Saya menerima sementara risiko CVE pada image PostgreSQL dan MinIO yang dipin, khusus untuk development lokal loopback-only. Image dilarang digunakan pada staging/production dan tidak boleh memproses data sensitif. Product Owner menjadi risk owner, dengan evaluasi ulang paling lambat 31 Agustus 2026 atau segera ketika image resmi baru tersedia.” |

Persetujuan ini tidak memperluas scope ke GOV-002, GOV-003 selain ADR-008,
FND-008, fitur aplikasi, atau deferred backlog. Pengecualian MinIO tidak
mengizinkan staging, production, redistribution, modification, atau hosted
service. Penerimaan risiko CVE bersifat sementara, hanya mencakup dua digest
yang dicatat untuk loopback local development, dan tidak mengizinkan data
sensitif.
