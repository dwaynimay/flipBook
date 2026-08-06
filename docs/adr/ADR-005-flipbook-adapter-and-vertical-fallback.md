# ADR-005: Flipbook Adapter and Vertical Fallback

## Status

Accepted on 6 August 2026 by the Product Owner.

## Context

Page-flip physics improve engagement but third-party lifecycle, index mapping,
gesture handling, and accessibility must not define product contracts.

## Decision

- Only `packages/flipbook-engine` may import the selected page-flip library.
- Apps depend on a typed controller based on logical `pageId` values.
- The adapter owns create, update, destroy, event cleanup, orientation mapping,
  interactive-region behavior, and error translation.
- A semantic vertical reader is always available for reduced motion,
  accessibility, small screens, and engine failure.
- Adoption requires React 19 lifecycle and interaction contract tests.

## Consequences

- The page-flip engine can be replaced without changing content or application
  contracts.
- The adapter has explicit testing and performance ownership.
- Flip effects can never be the only way to read or navigate content.

## Reconsider When

Replace the underlying engine when contract tests or measured maintenance risk
fail; keep the adapter and vertical fallback boundary.
