import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

import {
  normalizePnpmInventory,
  parseLicenseAllowlist,
  validateExactLicenseInventory,
  validateProductionLicenseInventory,
} from "./license-policy.mjs";

/**
 * @param {unknown} value
 * @returns {string}
 */
function requirePackageManagerCli(value) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("Run the license gate through a pnpm script.");
  }

  return value;
}

const packageManagerCli = requirePackageManagerCli(process.env.npm_execpath);

/**
 * @param {readonly string[]} additionalArguments
 * @returns {unknown}
 */
function readLicenseInventory(additionalArguments = []) {
  const result = spawnSync(
    process.execPath,
    [packageManagerCli, "licenses", "list", ...additionalArguments, "--json"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
    },
  );

  assert.equal(
    result.status,
    0,
    `Unable to read the installed dependency licenses.\n${result.stderr}`,
  );

  /** @type {unknown} */
  const inventory = JSON.parse(result.stdout);
  return inventory;
}

/** @type {unknown} */
const allowlist = JSON.parse(
  readFileSync(new URL("./licenses-allowlist.json", import.meta.url), "utf8"),
);
const actualRecords = normalizePnpmInventory(readLicenseInventory());
const productionRecords = normalizePnpmInventory(readLicenseInventory(["--prod"]));
const { platformAlternativeGroups, requiredRecords } = parseLicenseAllowlist(allowlist);
const summary = validateExactLicenseInventory(
  actualRecords,
  requiredRecords,
  platformAlternativeGroups,
);
const productionSummary = validateProductionLicenseInventory(productionRecords);

console.log(
  `Exact license gate passed for ${summary.packageCount} package-version records across ${summary.licenseCount} approved licenses; production inventory passed for ${productionSummary.packageCount} records across ${productionSummary.licenseCount} licenses.`,
);
