import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

import {
  normalizePnpmInventory,
  parseLicenseAllowlist,
  validateExactLicenseInventory,
} from "./license-policy.mjs";

const packageManagerCli = process.env.npm_execpath;

assert(packageManagerCli, "Run the license gate through a pnpm script.");

const result = spawnSync(process.execPath, [packageManagerCli, "licenses", "list", "--json"], {
  cwd: process.cwd(),
  encoding: "utf8",
});

assert.equal(
  result.status,
  0,
  `Unable to read the installed dependency licenses.\n${result.stderr}`,
);

/** @type {unknown} */
const pnpmInventory = JSON.parse(result.stdout);
/** @type {unknown} */
const allowlist = JSON.parse(
  readFileSync(new URL("./licenses-allowlist.json", import.meta.url), "utf8"),
);
const actualRecords = normalizePnpmInventory(pnpmInventory);
const { platformAlternativeGroups, requiredRecords } = parseLicenseAllowlist(allowlist);
const summary = validateExactLicenseInventory(
  actualRecords,
  requiredRecords,
  platformAlternativeGroups,
);

console.log(
  `Exact license gate passed for ${summary.packageCount} package-version records across ${summary.licenseCount} approved licenses.`,
);
