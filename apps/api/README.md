# `@booklet/api`

NestJS modular-monolith composition root. CON-003 exposes only the operational `GET /api/v1/health` route and establishes the transport boundary used by later domain modules.

## Contracts

- Every response carries `X-Request-Id`; valid bounded caller IDs are retained and invalid input is replaced through `@booklet/observability`. Request context is installed before the official Nest Express body parsers, so malformed JSON responses keep the same contract.
- Errors use the project-owned `ApiErrorEnvelopeDto`. Unknown exceptions and third-party response bodies are never reflected.
- Public problems use fixed factories. Validation details contain only a safe field path and a closed reason-code union.
- Retryable mutations must use `ApiIdempotencyKey` and `IdempotencyKeyHeader`; no production mutation exists yet.
- `openapi:generate` is the standalone command: it builds the API and its workspace dependencies through the Turbo graph, then creates `packages/api-contracts/openapi.json` from NestJS metadata without calling `listen()`. `openapi:emit` is the built-artifact step used by root contract orchestration and never starts a nested Turbo task.
- `PORT` accepts only canonical base-10 strings from 1 through 65535; partial or whitespace-padded values fail startup.

The test-only contract harness proves validation, idempotency, and failure behavior but is not imported by the application or emitted into OpenAPI.

Validation error factories accept an untrusted boundary value and emit at most 32 dense,
allowlisted field details. Sparse, augmented, oversized, accessor-failing, and revoked
array inputs are rejected with the fixed public registry error.
