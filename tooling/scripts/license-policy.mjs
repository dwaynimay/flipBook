/**
 * @typedef LicenseRecord
 * @property {string} license
 * @property {string} name
 * @property {string} version
 */

/**
 * @typedef PlatformAlternativeGroup
 * @property {string} id
 * @property {readonly LicenseRecord[]} records
 */

/**
 * @typedef ParsedLicenseAllowlist
 * @property {readonly PlatformAlternativeGroup[]} platformAlternativeGroups
 * @property {readonly LicenseRecord[]} requiredRecords
 */

const permittedLicenseIdentifiers = new Set([
  "(MIT OR CC0-1.0)",
  "0BSD",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "ISC",
  "MIT",
  "Python-2.0",
  "PostgreSQL",
]);

const permittedMplPackageKeys = new Set([
  "lightningcss@1.33.0",
  "lightningcss-android-arm64@1.33.0",
  "lightningcss-darwin-arm64@1.33.0",
  "lightningcss-darwin-x64@1.33.0",
  "lightningcss-freebsd-x64@1.33.0",
  "lightningcss-linux-arm-gnueabihf@1.33.0",
  "lightningcss-linux-arm64-gnu@1.33.0",
  "lightningcss-linux-arm64-musl@1.33.0",
  "lightningcss-linux-x64-gnu@1.33.0",
  "lightningcss-linux-x64-musl@1.33.0",
  "lightningcss-win32-arm64-msvc@1.33.0",
  "lightningcss-win32-x64-msvc@1.33.0",
]);

/**
 * @param {unknown} value
 * @returns {value is Readonly<Record<string, unknown>>}
 */
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * @param {unknown} inventory
 * @returns {readonly LicenseRecord[]}
 */
function normalizePnpmInventory(inventory) {
  if (!isRecord(inventory)) {
    throw new TypeError("pnpm returned an invalid license inventory.");
  }

  /** @type {LicenseRecord[]} */
  const records = [];

  for (const [license, packages] of Object.entries(inventory)) {
    if (!Array.isArray(packages)) {
      throw new TypeError(`Expected a package list for ${license}.`);
    }

    /** @type {readonly unknown[]} */
    const packageList = packages;

    for (const dependency of packageList) {
      if (
        !isRecord(dependency) ||
        typeof dependency.name !== "string" ||
        !Array.isArray(dependency.versions)
      ) {
        throw new TypeError(`Invalid dependency record under ${license}.`);
      }

      /** @type {readonly unknown[]} */
      const versions = dependency.versions;

      for (const version of versions) {
        if (typeof version !== "string") {
          throw new TypeError(`${dependency.name} has an invalid version.`);
        }

        records.push({
          license,
          name: dependency.name,
          version,
        });
      }
    }
  }

  return records;
}

/**
 * @param {unknown} allowlist
 * @returns {ParsedLicenseAllowlist}
 */
function parseLicenseAllowlist(allowlist) {
  if (!isRecord(allowlist) || !isRecord(allowlist.packages)) {
    throw new TypeError("The license allowlist must contain a packages object.");
  }

  const requiredRecords = parsePackageEntries(allowlist.packages, "allowlist");

  if (!Array.isArray(allowlist.platformAlternatives)) {
    throw new TypeError("The license allowlist must contain platformAlternatives.");
  }

  /** @type {readonly unknown[]} */
  const alternatives = allowlist.platformAlternatives;
  const platformAlternativeGroups = alternatives.map((alternative, index) => {
    if (
      !isRecord(alternative) ||
      typeof alternative.id !== "string" ||
      !isRecord(alternative.packages)
    ) {
      throw new TypeError(`Invalid platform alternative group at index ${index}.`);
    }

    return {
      id: alternative.id,
      records: parsePackageEntries(alternative.packages, `platform group ${alternative.id}`),
    };
  });

  return {
    platformAlternativeGroups,
    requiredRecords,
  };
}

/**
 * @param {Readonly<Record<string, unknown>>} packages
 * @param {string} source
 * @returns {readonly LicenseRecord[]}
 */
function parsePackageEntries(packages, source) {
  return Object.entries(packages).map(([packageKey, license]) => {
    const separatorIndex = packageKey.lastIndexOf("@");

    if (
      separatorIndex <= 0 ||
      separatorIndex === packageKey.length - 1 ||
      typeof license !== "string"
    ) {
      throw new TypeError(`Invalid ${source} entry: ${packageKey}.`);
    }

    return {
      license,
      name: packageKey.slice(0, separatorIndex),
      version: packageKey.slice(separatorIndex + 1),
    };
  });
}

/**
 * @param {string} packageKey
 * @param {string} license
 * @returns {void}
 */
function assertPermittedLicense(packageKey, license) {
  if (license === "BlueOak-1.0.0") {
    if (packageKey !== "minimatch@10.2.6") {
      throw new Error(`BlueOak-1.0.0 is approved only for minimatch@10.2.6, not ${packageKey}.`);
    }

    return;
  }

  if (license === "MPL-2.0") {
    if (!permittedMplPackageKeys.has(packageKey)) {
      throw new Error(
        `MPL-2.0 is approved only for the exact Lightning CSS 1.33.0 development toolchain, not ${packageKey}.`,
      );
    }

    return;
  }

  if (!permittedLicenseIdentifiers.has(license)) {
    throw new Error(`Prohibited or unapproved license for ${packageKey}: ${license}.`);
  }
}

/**
 * @param {readonly LicenseRecord[]} records
 * @param {string} source
 * @returns {ReadonlyMap<string, string>}
 */
function createRecordMap(records, source) {
  const mapped = new Map();

  for (const record of records) {
    const packageKey = `${record.name}@${record.version}`;

    if (mapped.has(packageKey)) {
      throw new Error(`Duplicate ${source} license entry: ${packageKey}.`);
    }

    mapped.set(packageKey, record.license);
  }

  return mapped;
}

/**
 * @param {readonly LicenseRecord[]} actualRecords
 * @param {readonly LicenseRecord[]} expectedRecords
 * @param {readonly PlatformAlternativeGroup[]} [platformAlternativeGroups]
 * @returns {{ readonly licenseCount: number; readonly packageCount: number }}
 */
function validateExactLicenseInventory(
  actualRecords,
  expectedRecords,
  platformAlternativeGroups = [],
) {
  const actual = createRecordMap(actualRecords, "installed");
  const expected = createRecordMap(expectedRecords, "allowlisted");
  const alternatives = new Map();

  for (const group of platformAlternativeGroups) {
    if (group.records.length === 0) {
      throw new Error(`Platform alternative group ${group.id} must not be empty.`);
    }

    const groupRecords = createRecordMap(group.records, `platform group ${group.id}`);

    for (const [packageKey, license] of groupRecords) {
      if (expected.has(packageKey) || alternatives.has(packageKey)) {
        throw new Error(`Duplicate license policy entry: ${packageKey}.`);
      }

      alternatives.set(packageKey, {
        groupId: group.id,
        license,
      });
    }
  }

  for (const [packageKey, actualLicense] of actual) {
    assertPermittedLicense(packageKey, actualLicense);

    const alternative = alternatives.get(packageKey);
    const expectedLicense = expected.get(packageKey) ?? alternative?.license;

    if (expectedLicense === undefined) {
      throw new Error(`Unexpected installed dependency: ${packageKey} (${actualLicense}).`);
    }

    if (actualLicense !== expectedLicense) {
      throw new Error(
        `License mismatch for ${packageKey}: expected ${expectedLicense}, received ${actualLicense}.`,
      );
    }
  }

  for (const [packageKey, expectedLicense] of expected) {
    assertPermittedLicense(packageKey, expectedLicense);

    if (!actual.has(packageKey)) {
      throw new Error(`Allowlisted dependency is not installed: ${packageKey}.`);
    }
  }

  for (const group of platformAlternativeGroups) {
    for (const record of group.records) {
      assertPermittedLicense(`${record.name}@${record.version}`, record.license);
    }

    const activeRecords = group.records.filter((record) =>
      actual.has(`${record.name}@${record.version}`),
    );

    if (activeRecords.length !== 1) {
      throw new Error(
        `Platform alternative group ${group.id} requires exactly one installed package; received ${activeRecords.length}.`,
      );
    }
  }

  return {
    licenseCount: new Set(actual.values()).size,
    packageCount: actual.size,
  };
}

/**
 * @param {readonly LicenseRecord[]} records
 * @returns {{ readonly licenseCount: number; readonly packageCount: number }}
 */
function validateProductionLicenseInventory(records) {
  const production = createRecordMap(records, "production");

  for (const [packageKey, license] of production) {
    assertPermittedLicense(packageKey, license);

    if (license === "MPL-2.0") {
      throw new Error(
        `Development-only MPL-2.0 dependency entered the production inventory: ${packageKey}.`,
      );
    }
  }

  return {
    licenseCount: new Set(production.values()).size,
    packageCount: production.size,
  };
}

export {
  normalizePnpmInventory,
  parseLicenseAllowlist,
  validateExactLicenseInventory,
  validateProductionLicenseInventory,
};
