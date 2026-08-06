# ADR-009: REST and OpenAPI Contract

## Status

Accepted on 6 August 2026 by the Product Owner.

## Context

The learner app, admin app, and API need one transport contract without
handwritten duplicate frontend DTOs or framework types leaking across package
boundaries.

## Decision

- Expose REST JSON endpoints under `/api/v1`.
- Generate the OpenAPI document from NestJS controllers and DTO metadata.
- Generate frontend contracts into `packages/api-contracts`; frontend apps must
  not retype API records manually or import NestJS/Prisma types.
- Validate request DTOs at the API boundary and treat untrusted payloads as
  unknown until parsed.
- Return a consistent error envelope with a stable machine-readable code,
  actionable message, correlation ID, and allowlisted details only; never leak
  stack traces or internal errors.
- Use cursor pagination for unbounded lists.
- Require idempotency or deduplication keys for retryable mutations where
  duplicate execution would violate behavior.
- Use presigned S3-compatible URLs for file transfer; the API validates and
  persists typed metadata rather than proxying unrestricted uploads.

## Consequences

- OpenAPI is the transport source of truth and generated contracts prevent DTO
  drift between applications.
- Contract generation, validation, error shapes, and compatibility require CI
  tests.
- Breaking endpoint or schema changes require an explicit versioning and
  migration decision.

## Reconsider When

Adopt another transport style only through a replacement ADR with measured
requirements, migration cost, security review, and equivalent generated-client
guarantees.
