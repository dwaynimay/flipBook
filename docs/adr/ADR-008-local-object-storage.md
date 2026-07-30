# ADR-008: Local Object Storage

## Status

Accepted on 31 July 2026 by the Product Owner.

## Context

The application requires an S3-compatible development target for upload and
object-storage integration. The approved architecture selects MinIO for local
development and an S3-compatible managed service for production.

MinIO Community Server is licensed under GNU AGPLv3. The repository license
policy normally prohibits AGPL runtime software without written approval. The
Product Owner explicitly approved a narrow exception for the unmodified MinIO
container used by local Docker Compose.

## Decision

- Local Docker Compose uses the official MinIO Community Server image
  `minio/minio:RELEASE.2025-09-07T16-13-09Z` pinned to multi-platform manifest
  digest
  `sha256:14cea493d9a34af32f524e538b8346cf79f3321eff8e708c1e2960462bd8936e`.
- The selected release corresponds to upstream tag
  `RELEASE.2025-09-07T16-13-09Z`.
- MinIO data is stored in the named volume `minio_data` mounted at `/data`.
- Production must use an independently reviewed S3-compatible service. This ADR
  does not approve MinIO for staging, production, redistribution, embedding, or
  a hosted service.
- The project does not modify or redistribute the MinIO image. Any change to
  that assumption requires a fresh engineering and legal review before use.
- Application packages depend only on the S3-compatible storage contract and
  must not expose MinIO-specific types or APIs.
- Image upgrades must pass the container image update gate in
  `THIRD_PARTY_LICENSES.md`.
- The Product Owner temporarily accepts the current exact-pinned PostgreSQL and
  MinIO image CVE risk only for loopback local development, owns that risk, and
  requires review no later than 31 August 2026 or when a newer official image
  becomes available.

## License Obligations

The local exception does not remove GNU AGPLv3 obligations. Preserve the
license and copyright notices supplied with the image, retain access to the
corresponding upstream source, and do not imply that MinIO trademarks are owned
by this project. If distribution, modification, or network use beyond this
local-development decision is proposed, obtain a fresh legal review before the
change is accepted.

## Security Boundary

The pinned release is reproducible, but a digest is not a security endorsement.
The image is development-only, binds explicitly to `127.0.0.1`, uses documented
local defaults instead of real/private credentials, and must not contain
production data. Known advisories are reassessed before every image update and
before any environment expansion. The separate time-bounded Product Owner risk
disposition applies only to the exact digests, prohibits staging, production,
non-loopback exposure, and sensitive data, and does not claim that findings are
remediated or suppressed. Counts, controls, ownership, and review triggers are
recorded in `docs/FND-007-IMAGE-SECURITY-TRIAGE.md`.

## Consequences

- Developers get a deterministic S3-compatible local target without coupling
  production deployment to MinIO.
- The AGPL exception is intentionally narrower than the general dependency
  policy.
- A production object-storage provider decision remains a later deployment
  concern and must satisfy the normal license, security, retention, and backup
  gates.

## Verification Sources

- MinIO release tag:
  https://github.com/minio/minio/releases/tag/RELEASE.2025-09-07T16-13-09Z
- MinIO source and GNU AGPLv3 license:
  https://github.com/minio/minio
- MinIO container deployment and `/data` persistence:
  https://github.com/minio/docs/blob/main/source/operations/deployments/baremetal-deploy-minio-as-a-container.rst
- MinIO health endpoints:
  https://github.com/minio/docs/blob/main/source/operations/monitoring/healthcheck-probe.rst
- Docker image digest reference:
  https://docs.docker.com/dhi/core-concepts/digests/
