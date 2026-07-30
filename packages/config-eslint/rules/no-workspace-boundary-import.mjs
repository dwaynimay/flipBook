import path from "node:path";

const deepWorkspaceImportPattern = /^@booklet\/[^/]+\/src(?:\/|$)/u;
const workspacePackagePathPattern = /\/packages\/([^/]+)(?:\/|$)/u;
const workspacePackageSourcePathPattern = /\/packages\/([^/]+)\//u;
const workspacePackageSrcPathPattern = /\/packages\/([^/]+)\/src(?:\/|$)/u;

const boundaryPolicies = [
  {
    forbiddenRoots: ["react", "react-dom", "prisma", "@nestjs", "@prisma"],
    packagePath: "/packages/content-schema/",
  },
  {
    forbiddenRoots: ["@booklet/block-editor"],
    packagePath: "/packages/block-renderer/",
  },
  {
    forbiddenRoots: ["@booklet/api-contracts", "@booklet/database", "prisma", "@prisma"],
    packagePath: "/packages/flipbook-engine/",
  },
  {
    forbiddenRoots: ["prisma", "@prisma"],
    packagePath: "/apps/web/",
  },
  {
    forbiddenRoots: ["prisma", "@prisma"],
    packagePath: "/apps/admin/",
  },
];

/**
 * @param {string} moduleName
 * @param {string} root
 * @returns {boolean}
 */
function isModuleRootOrSubpath(moduleName, root) {
  return moduleName === root || moduleName.startsWith(`${root}/`);
}

/**
 * @param {string} moduleName
 * @param {string} filename
 * @returns {{ readonly packageName: string; readonly targetsSource: boolean } | undefined}
 */
function resolveRelativeWorkspaceTarget(moduleName, filename) {
  if (!moduleName.startsWith(".")) {
    return undefined;
  }

  const resolvedPath = path.resolve(path.dirname(filename), moduleName).replaceAll("\\", "/");
  const packageMatch = workspacePackagePathPattern.exec(resolvedPath);

  if (packageMatch?.[1] === undefined) {
    return undefined;
  }

  return {
    packageName: `@booklet/${packageMatch[1]}`,
    targetsSource: workspacePackageSrcPathPattern.test(resolvedPath),
  };
}

/**
 * @param {unknown} value
 * @param {string} filename
 * @returns {"deepImport" | "forbiddenDependency" | undefined}
 */
function classifyViolation(value, filename) {
  if (typeof value !== "string") {
    return undefined;
  }

  if (deepWorkspaceImportPattern.test(value)) {
    return "deepImport";
  }

  const relativeTarget = resolveRelativeWorkspaceTarget(value, filename);
  const sourcePackageName = workspacePackageSourcePathPattern.exec(filename)?.[1];

  if (
    relativeTarget?.targetsSource === true &&
    relativeTarget.packageName !==
      (sourcePackageName === undefined ? undefined : `@booklet/${sourcePackageName}`)
  ) {
    return "deepImport";
  }

  const matchingPolicy = boundaryPolicies.find((policy) => filename.includes(policy.packagePath));
  const dependencyName = relativeTarget?.packageName ?? value;

  if (
    matchingPolicy?.forbiddenRoots.some((root) => isModuleRootOrSubpath(dependencyName, root)) ===
    true
  ) {
    return "forbiddenDependency";
  }

  return undefined;
}

/** @type {import("eslint").Rule.RuleModule} */
const noWorkspaceBoundaryImportRule = {
  create(context) {
    const filename = context.filename.replaceAll("\\", "/");

    /**
     * @param {import("eslint").Rule.Node} node
     * @param {unknown} value
     * @returns {void}
     */
    function inspectModule(node, value) {
      const messageId = classifyViolation(value, filename);

      if (messageId !== undefined) {
        context.report({
          messageId,
          node,
        });
      }
    }

    return {
      CallExpression(node) {
        if (
          node.callee.type === "Identifier" &&
          node.callee.name === "require" &&
          node.arguments.length > 0
        ) {
          const firstArgument = node.arguments[0];

          if (firstArgument !== undefined && firstArgument.type === "Literal") {
            inspectModule(node, firstArgument.value);
          }
        }
      },
      ExportAllDeclaration(node) {
        inspectModule(node, node.source.value);
      },
      ExportNamedDeclaration(node) {
        if (node.source !== null && node.source !== undefined) {
          inspectModule(node, node.source.value);
        }
      },
      ImportDeclaration(node) {
        inspectModule(node, node.source.value);
      },
      ImportExpression(node) {
        if (node.source.type === "Literal") {
          inspectModule(node, node.source.value);
        }
      },
    };
  },
  meta: {
    docs: {
      description: "Enforce public workspace exports and locked package dependency boundaries.",
    },
    messages: {
      deepImport: "Import another workspace package through its public exports.",
      forbiddenDependency:
        "This dependency and all of its subpaths are forbidden in the current workspace boundary.",
    },
    schema: [],
    type: "problem",
  },
};

export { noWorkspaceBoundaryImportRule };
