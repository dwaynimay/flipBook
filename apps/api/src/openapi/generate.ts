import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { createOpenApiDocument, serializeOpenApiDocument } from "./document.js";

const requestedOutputPath = process.argv[2];
const outputPath =
  requestedOutputPath === undefined
    ? resolve(process.cwd(), "../../packages/api-contracts/openapi.json")
    : resolve(requestedOutputPath);
const document = await createOpenApiDocument();

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, serializeOpenApiDocument(document), "utf8");
