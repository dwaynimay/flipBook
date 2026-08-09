# `@booklet/api-contracts`

Framework-free frontend transport types generated from the canonical NestJS OpenAPI document. Do not hand-edit `openapi.json` or `src/generated.ts`, and do not duplicate API DTOs in frontend applications.

Regenerate from the repository root:

```powershell
corepack pnpm run contracts:generate
```

The generator is isolated in `tooling/openapi-generator`. This package itself is compiled and declaration-checked with the repository's TypeScript 6 toolchain.

`corepack pnpm run contracts:check` builds current Nest metadata, generates two independent OpenAPI/type pairs in temporary directories, and byte-compares them with each other and the committed artifacts. CI and the normal root test graph execute this drift check without rewriting tracked files.
