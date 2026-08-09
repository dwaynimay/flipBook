import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import openapiTS, { astToString } from "openapi-typescript";
import { format, resolveConfig } from "prettier";

const schemaPath = resolve(
  process.argv[2] ?? resolve(process.cwd(), "../../packages/api-contracts/openapi.json"),
);
const outputPath = resolve(
  process.argv[3] ?? resolve(process.cwd(), "../../packages/api-contracts/src/generated.ts"),
);
const prettierConfig =
  (await resolveConfig(resolve(import.meta.dirname, "../../prettier.config.mjs"))) ?? {};
const schema = await readFile(schemaPath, "utf8");
const canonicalSchema = await format(schema, { ...prettierConfig, parser: "json" });
const ast = await openapiTS(canonicalSchema, {
  alphabetize: true,
  immutable: true,
});
const generated = await format(astToString(ast), { ...prettierConfig, parser: "typescript" });

await writeFile(schemaPath, canonicalSchema, "utf8");
await writeFile(outputPath, generated, "utf8");
