# FND-007 Container Image Security Triage

## Status

Accepted temporarily on 31 July 2026 for the two exact-pinned images, within the
controls and review window below. This disposition closes FND-007 but does not
remediate the findings.

The Product Owner separately approved the MinIO GNU AGPLv3 local-development
exception and the time-bounded container-image risk.

Product Owner approval (verbatim):

> “Saya menerima sementara risiko CVE pada image PostgreSQL dan MinIO yang
> dipin, khusus untuk development lokal loopback-only. Image dilarang digunakan
> pada staging/production dan tidak boleh memproses data sensitif. Product Owner
> menjadi risk owner, dengan evaluasi ulang paling lambat 31 Agustus 2026 atau
> segera ketika image resmi baru tersedia.”

## Risk Disposition

| Field | Decision |
| --- | --- |
| Risk owner | Product Owner |
| Images | Only the exact PostgreSQL and MinIO manifest digests listed below |
| Permitted environment | Developer-controlled local machine, loopback bindings only |
| Prohibited | Staging, production, hosted service, non-loopback exposure, and sensitive or production data |
| Review deadline | No later than 31 August 2026 |
| Earlier review trigger | A newer official PostgreSQL or MinIO image becomes available |
| Finding status | Open and temporarily accepted; not fixed, suppressed, or waived |

## Scan Context

| Field | Value |
| --- | --- |
| Date | 31 July 2026 |
| Scanner | Docker Scout `v1.23.1` |
| Severity scope | Critical and high |
| Suppression check | `--ignore-suppressed`; counts did not decrease |
| Runtime platform | Linux AMD64 through Docker Desktop/WSL 2 |

Scanner results are time-dependent and must be rerun when the advisory database
or image changes.

## Results

| Candidate | Exact manifest digest | Total findings | Fixable findings | Assessment |
| --- | --- | ---: | ---: | --- |
| PostgreSQL `17.10-alpine3.24` — current | `sha256:742f40ea20b9ff2ff31db5458d127452988a2164df9e17441e191f3b72252193` | 1 critical, 16 high | 1 critical, 16 high | Lowest observed official PostgreSQL 17.10 variant; temporarily accepted within the disposition |
| PostgreSQL `17.10-trixie` | `sha256:a426e44bac0b759c95894d68e1a0ac03ecc20b619f498a91aae373bf06d8508d` | 2 critical, 18 high | 1 critical, 16 high | Worse total count; not selected |
| PostgreSQL `17.10-bookworm` | `sha256:4f736ae292687621d4dbe0d499ffd024a36bd2ee7d8ca6f2ccd4c800f047b394` | 2 critical, 18 high | 1 critical, 16 high | Worse total count; not selected |
| MinIO `RELEASE.2025-09-07T16-13-09Z` — current | `sha256:14cea493d9a34af32f524e538b8346cf79f3321eff8e708c1e2960462bd8936e` | 21 critical, 43 high | 19 critical, 35 high | Temporarily accepted within the disposition; findings remain unresolved |

Docker Scout reports the PostgreSQL Alpine base as current with zero critical
or high base-image findings; the reported PostgreSQL image findings are
attributed to a bundled Go standard-library package. The official Debian
variants did not improve the result.

The official MinIO `latest` tag resolves to the same
`RELEASE.2025-09-07T16-13-09Z` manifest digest. Docker Scout provides no newer
base/tag recommendation for this image. No safer newer official MinIO Community
Server image was identified.

## Current Compensating Controls

- Services bind only to `127.0.0.1`.
- Credentials are documented local defaults and must never contain real/private
  values.
- MinIO is prohibited outside local development by ADR-008.
- Images are pinned by release tag and manifest digest.
- No production or sensitive data may be used.

These controls reduce exposure. The Product Owner's explicit disposition, not
the controls themselves, accepts the residual risk temporarily.

## Review Actions

At the deadline or earlier image-availability trigger:

1. Re-run the full image update gate against current official tags and exact
   candidate digests.
2. Prefer a reviewed official image that materially reduces the findings and
   passes compatibility/persistence tests.
3. If findings remain, obtain a new dated disposition from the Product Owner or
   stop using the affected image.
4. Evaluate a different local S3-compatible service only through a separately
   approved ADR.

Custom image rebuilds and proprietary MinIO alternatives remain outside this
decision because they require new scope, ownership, maintenance, and license
review.

## Commands Used

```powershell
docker scout cves --only-severity critical,high <exact-image>
docker scout cves --only-fixed --only-severity critical,high <exact-image>
docker scout cves --ignore-suppressed --only-severity critical,high <exact-image>
docker scout recommendations <exact-image>
docker buildx imagetools inspect <official-tag>
```
