# ADR-006: Cookie-Based Refresh Session

## Status

Accepted on 6 August 2026 by the Product Owner.

## Context

Learners and administrators require secure sessions without exposing long-lived
credentials to browser JavaScript storage.

## Decision

- Use short-lived access tokens and rotated refresh sessions.
- Deliver refresh credentials only through `HttpOnly` cookies; use `Secure` in
  production and an explicit `SameSite`/CSRF strategy.
- Store only hashed refresh-token material server-side and detect token reuse.
- Never place access or refresh tokens in `localStorage`.
- Hash passwords with Argon2id and rate-limit abuse-prone auth endpoints.

## Consequences

- Browser token theft exposure is reduced and sessions can be revoked.
- Cookie, CORS, CSRF, rotation, logout, and reuse behavior require integration
  tests and environment-specific security configuration.
- Password reset is deferred from MVP by GOV-002 and is not implied here.

## Reconsider When

A different identity model requires a security ADR, threat review, migration
plan, and equivalent revocation guarantees.
