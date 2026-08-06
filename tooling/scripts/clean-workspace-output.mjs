import { realpathSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = realpathSync(fileURLToPath(new URL("../../", import.meta.url)));
const relativeOutput = process.argv[2];

if (
  typeof relativeOutput !== "string" ||
  !/^(apps|packages)\/[a-z0-9-]+\/dist$/.test(relativeOutput)
) {
  throw new Error("Expected an apps/<name>/dist or packages/<name>/dist output path.");
}

const outputPath = path.resolve(repositoryRoot, relativeOutput);
const workspacePath = realpathSync(path.dirname(outputPath));
const expectedWorkspacePath = path.resolve(repositoryRoot, path.dirname(relativeOutput));

if (
  workspacePath !== expectedWorkspacePath ||
  !outputPath.startsWith(`${workspacePath}${path.sep}`)
) {
  throw new Error("Refusing to clean an output outside the requested workspace.");
}

rmSync(outputPath, { force: true, recursive: true });
