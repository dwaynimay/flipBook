import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ESLint } from "eslint";

import { configWithoutIgnores } from "./index.mjs";

const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
const eslint = new ESLint({
  cwd: repositoryRoot,
  overrideConfig: configWithoutIgnores,
  overrideConfigFile: true,
});

const contentSchemaResult = await eslint.lintText(
  'import React from "react";\nconst leaked: any = window.localStorage;\nvoid fetch("/");\nexport { leaked, React };\n',
  {
    filePath: path.join(repositoryRoot, "packages/content-schema/src/unsafe.ts"),
  },
);
const contentSchemaRules = new Set(
  contentSchemaResult.flatMap((result) => result.messages.map((message) => message.ruleId)),
);

assert(contentSchemaRules.has("@typescript-eslint/no-explicit-any"));
assert(contentSchemaRules.has("no-restricted-imports"));
assert(contentSchemaRules.has("no-restricted-globals"));

const packageBoundaryResult = await eslint.lintText(
  'import api from "../../apps/api/src/main";\n',
  {
    filePath: path.join(repositoryRoot, "packages/ui/src/unsafe.ts"),
  },
);
const packageBoundaryRules = new Set(
  packageBoundaryResult.flatMap((result) => result.messages.map((message) => message.ruleId)),
);

assert(packageBoundaryRules.has("no-restricted-imports"));

const frontendResult = await eslint.lintText(
  'import { PrismaClient } from "@prisma/client";\nimport value from "@booklet/ui/src/value";\nexport { PrismaClient, value };\n',
  {
    filePath: path.join(repositoryRoot, "apps/web/src/unsafe.ts"),
  },
);
const frontendImportViolations = frontendResult.flatMap((result) =>
  result.messages.filter((message) => message.ruleId === "no-restricted-imports"),
);

assert.equal(frontendImportViolations.length, 2);

const forbiddenWorkspaceBoundaryCases = [
  {
    code: 'import value from "@booklet/database/src/value";\nexport { value };\n',
    file: "apps/api/src/unsafe-deep-import.ts",
  },
  {
    code: 'export * from "@booklet/block-editor/internal";\n',
    file: "packages/block-renderer/src/unsafe-editor-subpath.ts",
  },
  {
    code: 'const contract = import("@booklet/api-contracts/generated");\nexport { contract };\n',
    file: "packages/flipbook-engine/src/unsafe-api-contract-subpath.ts",
  },
  {
    code: 'const model = require("@booklet/database/models");\nmodule.exports = model;\n',
    file: "packages/flipbook-engine/src/unsafe-database-subpath.cjs",
  },
  {
    code: 'import client from "react-dom/client";\nexport { client };\n',
    file: "packages/content-schema/src/unsafe-react-subpath.ts",
  },
  {
    code: 'import value from "../../../packages/database/src/value";\nexport { value };\n',
    file: "apps/api/src/unsafe-relative-deep-import.ts",
  },
  {
    code: 'import value from "../../database/src/value";\nexport { value };\n',
    file: "packages/ui/src/unsafe-relative-deep-import.ts",
  },
  {
    code: 'import value from "../../block-editor/src/value";\nexport { value };\n',
    file: "packages/block-renderer/src/unsafe-relative-editor-import.ts",
  },
];

for (const forbiddenCase of forbiddenWorkspaceBoundaryCases) {
  const result = await eslint.lintText(forbiddenCase.code, {
    filePath: path.join(repositoryRoot, forbiddenCase.file),
  });

  assert(
    result
      .flatMap((lintResult) => lintResult.messages)
      .some((message) => message.ruleId === "booklet-imports/no-workspace-boundary"),
    `Expected workspace boundary failure for ${forbiddenCase.file}.`,
  );
}

const allowedWorkspaceBoundaryCases = [
  {
    code: 'import database from "@booklet/database";\nexport { database };\n',
    file: "apps/api/src/allowed-database-root.ts",
  },
  {
    code: 'import schema from "@booklet/content-schema";\nexport { schema };\n',
    file: "packages/block-renderer/src/allowed-schema-root.ts",
  },
  {
    code: 'import renderer from "@booklet/block-renderer";\nexport { renderer };\n',
    file: "packages/flipbook-engine/src/allowed-renderer-root.ts",
  },
  {
    code: 'import value from "./internal/value";\nexport { value };\n',
    file: "packages/block-renderer/src/allowed-same-package-relative.ts",
  },
];

for (const allowedCase of allowedWorkspaceBoundaryCases) {
  const result = await eslint.lintText(allowedCase.code, {
    filePath: path.join(repositoryRoot, allowedCase.file),
  });

  assert(
    result
      .flatMap((lintResult) => lintResult.messages)
      .every((message) => message.ruleId !== "booklet-imports/no-workspace-boundary"),
    `Expected workspace boundary success for ${allowedCase.file}.`,
  );
}

const forbiddenPageFlipCases = [
  {
    code: 'import { PageFlip } from "page-flip";\nexport { PageFlip };\n',
    file: "apps/api/src/unsafe-root.ts",
  },
  {
    code: 'import HTMLFlipBook from "react-pageflip";\nexport { HTMLFlipBook };\n',
    file: "apps/api/src/unsafe-react-root.ts",
  },
  {
    code: 'import engine from "page-flip/internal";\nexport { engine };\n',
    file: "apps/api/src/unsafe-subpath.ts",
  },
  {
    code: 'const engine = import("react-pageflip/dist/index.js");\nexport { engine };\n',
    file: "apps/api/src/unsafe-dynamic-import.ts",
  },
  {
    code: 'const engine = require("page-flip/dist/index.js");\nmodule.exports = engine;\n',
    file: "apps/api/src/unsafe-require.cjs",
  },
  {
    code: 'export * from "react-pageflip/internal";\n',
    file: "packages/ui/src/unsafe-reexport.ts",
  },
];

for (const forbiddenCase of forbiddenPageFlipCases) {
  const result = await eslint.lintText(forbiddenCase.code, {
    filePath: path.join(repositoryRoot, forbiddenCase.file),
  });

  assert(
    result
      .flatMap((lintResult) => lintResult.messages)
      .some((message) => message.ruleId === "booklet-imports/no-page-flip"),
    `Expected page-flip policy failure for ${forbiddenCase.file}.`,
  );
}

const pageFlipInsideAdapterResult = await eslint.lintText(
  'import { PageFlip } from "page-flip/dist/index.js";\nexport { PageFlip };\n',
  {
    filePath: path.join(repositoryRoot, "packages/flipbook-engine/src/adapter.ts"),
  },
);
assert(
  pageFlipInsideAdapterResult
    .flatMap((result) => result.messages)
    .every(
      (message) =>
        message.ruleId !== "no-restricted-imports" &&
        message.ruleId !== "booklet-imports/no-page-flip",
    ),
);

const similarModuleNameResult = await eslint.lintText(
  'import engine from "page-flipper";\nexport { engine };\n',
  {
    filePath: path.join(repositoryRoot, "apps/api/src/allowed-similar-name.ts"),
  },
);
assert(
  similarModuleNameResult
    .flatMap((result) => result.messages)
    .every((message) => message.ruleId !== "booklet-imports/no-page-flip"),
);

const forbiddenDoubleAssertions = [
  "const coerced = value as unknown as string;",
  "const coerced = (value as unknown) as string;",
  "const coerced = (<unknown>value) as string;",
  "const coerced = <string>(<unknown>value);",
  "const coerced = (value as unknown)! as string;",
  "const coerced = (value as unknown)?.toString() as string;",
];

for (const [index, assertion] of forbiddenDoubleAssertions.entries()) {
  const result = await eslint.lintText(
    `declare const value: unknown;\n${assertion}\nexport { coerced };\n`,
    {
      filePath: path.join(repositoryRoot, `packages/ui/src/unsafe-assertion-${index}.ts`),
    },
  );

  assert(
    result
      .flatMap((lintResult) => lintResult.messages)
      .some((message) => message.ruleId === "booklet-types/no-unsafe-double-assertion"),
    `Expected double-assertion policy failure for case ${index}.`,
  );
}

const allowedSingleAssertionResult = await eslint.lintText(
  "declare const value: string | null;\nconst widened = value as unknown;\nconst chained = value?.toString() as string;\nexport { chained, widened };\n",
  {
    filePath: path.join(repositoryRoot, "packages/ui/src/allowed-single-assertion.ts"),
  },
);
assert(
  allowedSingleAssertionResult
    .flatMap((result) => result.messages)
    .every((message) => message.ruleId !== "booklet-types/no-unsafe-double-assertion"),
);

const forbiddenJsdocCases = [
  "/** @type {any} */\nconst value = 1;\nexport { value };\n",
  "/** @param {any} value */\nexport function directParam(value) { return value; }\n",
  "/** @param {Array<any>} values */\nexport function read(values) { return values; }\n",
  "/** @returns {any} */\nexport function directReturn() { return 1; }\n",
  "/** @returns {Promise<string | any>} */\nexport function read() { return Promise.resolve('ok'); }\n",
  "/** @property {Record<string, Array<any>>} values */\nexport const record = {};\n",
  "/** @template {any} Value */\nexport function template(value) { return value; }\n",
  "/** @augments {Array<any>} */\nexport class Augmented {}\n",
  "/** @exception {any} */\nexport function exceptional() {}\n",
  "/** @const {any} */\nexport const constantAlias = 1;\n",
  "/** @constant {Array<any>} */\nexport const constant = [];\n",
  "/** @member {any} */\nexport const member = 1;\n",
  "/** @var {Promise<any>} */\nexport const variable = Promise.resolve();\n",
];

for (const [index, code] of forbiddenJsdocCases.entries()) {
  const result = await eslint.lintText(code, {
    filePath: path.join(repositoryRoot, `tooling/unsafe-jsdoc-${index}.mjs`),
  });

  assert(
    result
      .flatMap((lintResult) => lintResult.messages)
      .some((message) => message.ruleId === "booklet/no-jsdoc-any"),
    `Expected JSDoc any policy failure for case ${index}.`,
  );
}

const allowedJsdocResult = await eslint.lintText(
  [
    "/**",
    " * Accepts any company description without weakening its type.",
    " * @param {string} company - any company name",
    ' * @returns {"any" | string} a literal or string',
    " * @example {any}",
    " * @description {any} remains freeform prose",
    " * {@link any}",
    " * @type {Company<anything>}",
    " */",
    "export function read(company) { return company; }",
  ].join("\n"),
  {
    filePath: path.join(repositoryRoot, "tooling/allowed-jsdoc-description.mjs"),
  },
);
assert(
  allowedJsdocResult
    .flatMap((result) => result.messages)
    .every((message) => message.ruleId !== "booklet/no-jsdoc-any"),
);

console.log(
  "ESLint policy rejected JSDoc any, wrapped assertions, page-flip subpaths, browser APIs, deep imports, and dependency subpaths.",
);
