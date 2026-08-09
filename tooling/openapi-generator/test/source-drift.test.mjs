import test from "node:test";

import { checkContractDrift } from "../contract-check.mjs";

test("Nest metadata, OpenAPI, and generated TypeScript have no drift", async () => {
  await checkContractDrift();
});
