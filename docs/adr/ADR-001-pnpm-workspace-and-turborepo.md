# ADR-001: pnpm Workspace and Turborepo

## Status

Accepted on 6 August 2026 by the Product Owner.

## Context

The repository needs one dependency graph for independently buildable web,
admin, API, and reusable packages without creating a second nested monorepo.

## Decision

- Use pnpm workspaces with one root lockfile.
- Use Turborepo for the task graph and cache coordination.
- Internal dependencies use `workspace:*` and public package exports.
- Every app or package owns its scripts; root scripts orchestrate real tasks.
- `apps/api` is a standalone NestJS workspace package, not a Nest CLI monorepo.

## Consequences

- Installation and CI remain reproducible across the repository.
- Package boundaries are explicit and independently verifiable.
- Nested lockfiles, deep imports, and mixed package managers are prohibited.

## Reconsider When

Only reconsider if measured workspace or release constraints cannot be solved
within pnpm and Turborepo without weakening reproducibility.
