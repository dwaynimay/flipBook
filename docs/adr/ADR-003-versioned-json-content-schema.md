# ADR-003: Versioned JSON Content Schema

## Status

Accepted on 6 August 2026 by the Product Owner.

## Context

Editable booklet pages need reusable interactive blocks without executing
untrusted code or coupling persisted content to React components.

## Decision

- Store each page as a versioned JSON document validated by
  `packages/content-schema`.
- Every document has `schemaVersion`; every block has stable `id`, `type`,
  `version`, and typed `props`.
- Blocks form a discriminated union and external input begins as `unknown`.
- Store only allowlisted values and references; arbitrary HTML, JavaScript,
  iframe providers, CSS, and component names are prohibited.
- Reader compatibility uses explicit migrators and a safe unknown-block fallback.

## Consequences

- Preview and reader can share one safe renderer.
- Schema evolution is explicit, testable, and independent of UI implementation.
- New block types require schema, migration policy, renderer, and fixtures.

## Reconsider When

The JSON model may evolve through a new ADR, but executable persisted
configuration remains outside the security boundary.
