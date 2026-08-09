# OpenAPI Type Generator

This workspace owns only deterministic `openapi.json` to TypeScript generation. `openapi-typescript@7.13.0` declares a TypeScript `^5.x` peer, so its exact `typescript@5.9.3` dependency is isolated here. It is not a compiler for authored application or package code.

`apps/api` and `packages/api-contracts` remain pinned to TypeScript 6.0.3. The generated output is formatted deterministically, checked for drift, and compiled by the consumer package under TypeScript 6.

The check path generates fresh artifacts from the current built NestJS source into temporary directories, compares two runs for determinism, compares both committed files byte-for-byte, and removes only its own temporary directory.
