import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const apiGenerator = resolve(repositoryRoot, "apps/api/dist/openapi/generate.js");
const typeGenerator = resolve(import.meta.dirname, "generate.mjs");
const committedOpenApi = resolve(repositoryRoot, "packages/api-contracts/openapi.json");
const committedTypes = resolve(repositoryRoot, "packages/api-contracts/src/generated.ts");

function runGenerator(script, arguments_) {
  const result = spawnSync(process.execPath, [script, ...arguments_], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, `Contract generator failed: ${result.stderr || result.stdout}`);
}

async function generatePair(directory, suffix) {
  const openApiPath = join(directory, `openapi-${suffix}.json`);
  const typesPath = join(directory, `generated-${suffix}.ts`);
  runGenerator(apiGenerator, [openApiPath]);
  runGenerator(typeGenerator, [openApiPath, typesPath]);
  return Promise.all([readFile(openApiPath), readFile(typesPath)]);
}

export async function checkContractDrift() {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "booklet-contracts-"));

  try {
    const [
      [firstOpenApi, firstTypes],
      [secondOpenApi, secondTypes],
      expectedOpenApi,
      expectedTypes,
    ] = await Promise.all([
      generatePair(temporaryDirectory, "first"),
      generatePair(temporaryDirectory, "second"),
      readFile(committedOpenApi),
      readFile(committedTypes),
    ]);

    assert.deepEqual(firstOpenApi, secondOpenApi, "OpenAPI generation is not deterministic.");
    assert.deepEqual(firstTypes, secondTypes, "Type generation is not deterministic.");
    assert.deepEqual(expectedOpenApi, firstOpenApi, "Committed openapi.json has source drift.");
    assert.deepEqual(expectedTypes, firstTypes, "Committed generated.ts has source drift.");
  } finally {
    await rm(temporaryDirectory, { force: true, recursive: true });
  }
}
