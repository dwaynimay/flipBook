import assert from "node:assert/strict";

import { parseLicenseAllowlist, validateExactLicenseInventory } from "./license-policy.mjs";

const expected = [
  {
    license: "MIT",
    name: "eslint",
    version: "10.8.0",
  },
  {
    license: "BlueOak-1.0.0",
    name: "minimatch",
    version: "10.2.6",
  },
];

assert.deepEqual(validateExactLicenseInventory(expected, expected), {
  licenseCount: 2,
  packageCount: 2,
});

assert.throws(
  () =>
    validateExactLicenseInventory(
      expected.map((record) =>
        record.name === "eslint" ? { ...record, version: "10.8.1" } : record,
      ),
      expected,
    ),
  /Unexpected installed dependency/u,
);

assert.throws(
  () =>
    validateExactLicenseInventory(
      expected.map((record) =>
        record.name === "eslint" ? { ...record, license: "GPL-3.0-only" } : record,
      ),
      expected,
    ),
  /Prohibited or unapproved license/u,
);

for (const license of [
  "GPL-3.0-only",
  "AGPL-3.0-only",
  "SSPL-1.0",
  "BUSL-1.1",
  "Proprietary",
  "UNKNOWN",
]) {
  const synchronizedProhibitedRecord = [
    {
      license,
      name: "prohibited-package",
      version: "1.0.0",
    },
  ];

  assert.throws(
    () => validateExactLicenseInventory(synchronizedProhibitedRecord, synchronizedProhibitedRecord),
    /Prohibited or unapproved license/u,
  );
}

assert.throws(
  () =>
    validateExactLicenseInventory(
      [{ license: "BlueOak-1.0.0", name: "other-package", version: "1.0.0" }],
      [{ license: "BlueOak-1.0.0", name: "other-package", version: "1.0.0" }],
    ),
  /approved only for minimatch@10\.2\.6/u,
);

assert.throws(
  () => validateExactLicenseInventory(expected.slice(0, 1), expected),
  /Allowlisted dependency is not installed/u,
);

const turboPlatformAlternatives = [
  {
    id: "turbo-native",
    records: [
      { license: "MIT", name: "@turbo/windows-64", version: "2.10.7" },
      { license: "MIT", name: "@turbo/linux-64", version: "2.10.7" },
      { license: "MIT", name: "@turbo/darwin-arm64", version: "2.10.7" },
    ],
  },
];
const portableRequired = [{ license: "MIT", name: "turbo", version: "2.10.7" }];

for (const platformPackage of ["@turbo/windows-64", "@turbo/linux-64", "@turbo/darwin-arm64"]) {
  const installed = [
    ...portableRequired,
    { license: "MIT", name: platformPackage, version: "2.10.7" },
  ];

  assert.deepEqual(
    validateExactLicenseInventory(installed, portableRequired, turboPlatformAlternatives),
    {
      licenseCount: 1,
      packageCount: 2,
    },
  );
}

for (const invalidPlatformRecord of [
  { license: "MIT", name: "@turbo/solaris-64", version: "2.10.7" },
  { license: "MIT", name: "@turbo/linux-64", version: "2.10.8" },
  { license: "Apache-2.0", name: "@turbo/linux-64", version: "2.10.7" },
]) {
  assert.throws(
    () =>
      validateExactLicenseInventory(
        [...portableRequired, invalidPlatformRecord],
        portableRequired,
        turboPlatformAlternatives,
      ),
    /Unexpected installed dependency|License mismatch/u,
  );
}

assert.throws(
  () =>
    validateExactLicenseInventory(portableRequired, portableRequired, turboPlatformAlternatives),
  /requires exactly one installed package/u,
);

assert.throws(
  () =>
    validateExactLicenseInventory(
      [
        ...portableRequired,
        { license: "MIT", name: "@turbo/windows-64", version: "2.10.7" },
        { license: "MIT", name: "@turbo/linux-64", version: "2.10.7" },
      ],
      portableRequired,
      turboPlatformAlternatives,
    ),
  /requires exactly one installed package/u,
);

const parsedPortableAllowlist = parseLicenseAllowlist({
  packages: {
    "turbo@2.10.7": "MIT",
  },
  platformAlternatives: [
    {
      id: "turbo-native",
      packages: {
        "@turbo/linux-64@2.10.7": "MIT",
        "@turbo/windows-64@2.10.7": "MIT",
      },
    },
  ],
});
assert.equal(parsedPortableAllowlist.requiredRecords.length, 1);
assert.equal(parsedPortableAllowlist.platformAlternativeGroups[0]?.records.length, 2);

console.log("Exact license policy rejected prohibited licenses and invalid platform alternatives.");
