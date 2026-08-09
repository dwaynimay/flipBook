import { checkContractDrift } from "./contract-check.mjs";

await checkContractDrift();
console.log("OpenAPI source-to-generated drift check passed.");
