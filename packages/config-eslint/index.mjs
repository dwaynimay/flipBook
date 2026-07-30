import eslint from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import typescriptEslint from "typescript-eslint";

import { noJsdocAnyRule } from "./rules/no-jsdoc-any.mjs";
import { noPageFlipImportRule } from "./rules/no-page-flip-import.mjs";
import { noUnsafeDoubleAssertionRule } from "./rules/no-unsafe-double-assertion.mjs";
import { noWorkspaceBoundaryImportRule } from "./rules/no-workspace-boundary-import.mjs";

const sourceFiles = ["**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx}"];
const typescriptFiles = ["**/*.{ts,mts,cts,tsx}"];
const packageFiles = ["packages/**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx}"];

const pageFlipImportRestrictions = [
  {
    message: "Only @booklet/flipbook-engine may import the page-flip implementation.",
    name: "page-flip",
  },
  {
    message: "Only @booklet/flipbook-engine may import the page-flip implementation.",
    name: "react-pageflip",
  },
];

const packageImportRestrictions = [
  {
    group: ["apps/*", "*/apps/*", "**/apps/**"],
    message: "Workspace packages must never import from apps/*.",
  },
  {
    group: ["@booklet/*/src", "@booklet/*/src/*"],
    message: "Import another workspace package through its public exports.",
  },
];

const frontendImportRestrictions = [
  {
    group: ["@prisma/*", "prisma"],
    message: "Frontend applications must not import Prisma.",
  },
  {
    group: ["@booklet/*/src", "@booklet/*/src/*"],
    message: "Import another workspace package through its public exports.",
  },
];

const configWithoutIgnores = defineConfig([
  {
    ...eslint.configs.recommended,
    files: ["**/*.{js,mjs,cjs,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      globals: {
        Buffer: "readonly",
        URL: "readonly",
        console: "readonly",
        process: "readonly",
      },
      sourceType: "module",
    },
    plugins: {
      booklet: {
        rules: {
          "no-jsdoc-any": noJsdocAnyRule,
        },
      },
    },
    rules: {
      ...eslint.configs.recommended.rules,
      "booklet/no-jsdoc-any": "error",
    },
  },
  {
    files: sourceFiles,
    plugins: {
      "booklet-imports": {
        rules: {
          "no-page-flip": noPageFlipImportRule,
          "no-workspace-boundary": noWorkspaceBoundaryImportRule,
        },
      },
    },
    rules: {
      "booklet-imports/no-workspace-boundary": "error",
    },
  },
  {
    files: sourceFiles,
    ignores: ["packages/flipbook-engine/**"],
    rules: {
      "booklet-imports/no-page-flip": "error",
    },
  },
  {
    files: typescriptFiles,
    plugins: {
      "booklet-types": {
        rules: {
          "no-unsafe-double-assertion": noUnsafeDoubleAssertionRule,
        },
      },
    },
    rules: {
      "booklet-types/no-unsafe-double-assertion": "error",
    },
  },
  {
    extends: [typescriptEslint.configs.strict],
    files: typescriptFiles,
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          fixStyle: "inline-type-imports",
          prefer: "type-imports",
        },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "no-warning-comments": [
        "error",
        {
          location: "anywhere",
          terms: ["fixme"],
        },
      ],
    },
  },
  {
    files: packageFiles,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: pageFlipImportRestrictions,
          patterns: packageImportRestrictions,
        },
      ],
    },
  },
  {
    files: ["packages/content-schema/**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            ...pageFlipImportRestrictions,
            {
              message: "content-schema must remain framework-free.",
              name: "prisma",
            },
            {
              message: "content-schema must remain framework-free.",
              name: "react",
            },
            {
              message: "content-schema must remain framework-free.",
              name: "react-dom",
            },
          ],
          patterns: [
            ...packageImportRestrictions,
            {
              group: ["@nestjs/*", "@prisma/*"],
              message: "content-schema must remain framework-free.",
            },
          ],
        },
      ],
      "no-restricted-globals": [
        "error",
        ...[
          "document",
          "fetch",
          "HTMLElement",
          "localStorage",
          "MutationObserver",
          "navigator",
          "Notification",
          "requestAnimationFrame",
          "sessionStorage",
          "WebSocket",
          "window",
        ].map((name) => ({
          message: "content-schema must not use browser globals or browser APIs.",
          name,
        })),
      ],
    },
  },
  {
    files: ["packages/block-renderer/**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            ...pageFlipImportRestrictions,
            {
              message: "block-renderer must not depend on block-editor.",
              name: "@booklet/block-editor",
            },
          ],
          patterns: packageImportRestrictions,
        },
      ],
    },
  },
  {
    files: ["packages/flipbook-engine/**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              message: "flipbook-engine must not know API contracts.",
              name: "@booklet/api-contracts",
            },
            {
              message: "flipbook-engine must not know database models.",
              name: "@booklet/database",
            },
            {
              message: "flipbook-engine must not import Prisma.",
              name: "prisma",
            },
          ],
          patterns: [
            ...packageImportRestrictions,
            {
              group: ["@prisma/*"],
              message: "flipbook-engine must not import Prisma.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["apps/{web,admin}/**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: pageFlipImportRestrictions,
          patterns: frontendImportRestrictions,
        },
      ],
    },
  },
  {
    files: sourceFiles,
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },
  },
]);

const projectConfig = defineConfig([
  globalIgnores(
    [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/.turbo/**",
      "**/.vite/**",
      "**/.*",
      "graphify-out/**",
      "packages/config-typescript/fixtures/negative/**",
    ],
    "booklet/generated-and-negative-fixtures",
  ),
  ...configWithoutIgnores,
]);

export { configWithoutIgnores };
export default projectConfig;
