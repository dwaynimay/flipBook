import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import typescript from "typescript";

const require = createRequire(import.meta.url);
const compilerPath = require.resolve("typescript/bin/tsc");
const negativeConfigPath = fileURLToPath(
  new URL("./fixtures/negative/tsconfig.json", import.meta.url),
);
const result = spawnSync(process.execPath, [compilerPath, "-p", negativeConfigPath, "--noEmit"], {
  encoding: "utf8",
});
const diagnostics = `${result.stdout}${result.stderr}`;

assert.notEqual(result.status, 0, "The strict negative fixture must fail compilation.");
assert.match(diagnostics, /TS2322/, "noUncheckedIndexedAccess must reject unsafe index access.");
assert.match(
  diagnostics,
  /TS2375/,
  "exactOptionalPropertyTypes must reject an explicit undefined optional value.",
);
assert.match(
  diagnostics,
  /TS2584/,
  "The framework-free config must reject DOM globals such as document.",
);

/**
 * @param {string} relativeConfigPath
 * @returns {import("typescript").ParsedCommandLine}
 */
function parseConfig(relativeConfigPath) {
  const configPath = fileURLToPath(new URL(relativeConfigPath, import.meta.url));
  const readResult = typescript.readConfigFile(configPath, typescript.sys.readFile);

  assert.equal(
    readResult.error,
    undefined,
    readResult.error === undefined
      ? undefined
      : typescript.flattenDiagnosticMessageText(readResult.error.messageText, "\n"),
  );

  const parsed = typescript.parseJsonConfigFileContent(
    readResult.config,
    typescript.sys,
    path.dirname(configPath),
  );

  assert.equal(
    parsed.errors.length,
    0,
    parsed.errors
      .map((error) => typescript.flattenDiagnosticMessageText(error.messageText, "\n"))
      .join("\n"),
  );

  return parsed;
}

const browserConfig = parseConfig("./browser.json");
const browserLibraries = browserConfig.options.lib?.map((library) => path.basename(library));

assert.equal(browserConfig.options.isolatedModules, true);
assert.equal(browserConfig.options.module, typescript.ModuleKind.ESNext);
assert.equal(browserConfig.options.moduleResolution, typescript.ModuleResolutionKind.Bundler);
assert.deepEqual(browserLibraries, ["lib.es2023.d.ts", "lib.dom.d.ts", "lib.dom.iterable.d.ts"]);

const reactLibraryConfig = parseConfig("./react-library.json");
const reactLibraries = reactLibraryConfig.options.lib?.map((library) => path.basename(library));

assert.equal(reactLibraryConfig.options.emitDeclarationOnly, false);
assert.equal(reactLibraryConfig.options.isolatedModules, true);
assert.equal(reactLibraryConfig.options.jsx, typescript.JsxEmit.ReactJSX);
assert.equal(reactLibraryConfig.options.moduleResolution, typescript.ModuleResolutionKind.Bundler);
assert.deepEqual(reactLibraries, ["lib.es2023.d.ts", "lib.dom.d.ts", "lib.dom.iterable.d.ts"]);

console.log(
  "Strict and framework-free fixtures rejected unsafe code; browser and React presets retain their environment contracts.",
);
