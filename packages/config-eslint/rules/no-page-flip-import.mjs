const forbiddenModuleRoots = ["page-flip", "react-pageflip"];

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function isForbiddenModuleName(value) {
  return (
    typeof value === "string" &&
    forbiddenModuleRoots.some((root) => value === root || value.startsWith(`${root}/`))
  );
}

/** @type {import("eslint").Rule.RuleModule} */
const noPageFlipImportRule = {
  create(context) {
    return {
      CallExpression(node) {
        if (
          node.callee.type === "Identifier" &&
          node.callee.name === "require" &&
          node.arguments.length > 0
        ) {
          const firstArgument = node.arguments[0];

          if (
            firstArgument !== undefined &&
            firstArgument.type === "Literal" &&
            isForbiddenModuleName(firstArgument.value)
          ) {
            context.report({
              messageId: "forbidden",
              node,
            });
          }
        }
      },
      ExportAllDeclaration(node) {
        if (isForbiddenModuleName(node.source.value)) {
          context.report({
            messageId: "forbidden",
            node,
          });
        }
      },
      ExportNamedDeclaration(node) {
        if (
          node.source !== null &&
          node.source !== undefined &&
          isForbiddenModuleName(node.source.value)
        ) {
          context.report({
            messageId: "forbidden",
            node,
          });
        }
      },
      ImportDeclaration(node) {
        if (isForbiddenModuleName(node.source.value)) {
          context.report({
            messageId: "forbidden",
            node,
          });
        }
      },
      ImportExpression(node) {
        if (node.source.type === "Literal" && isForbiddenModuleName(node.source.value)) {
          context.report({
            messageId: "forbidden",
            node,
          });
        }
      },
    };
  },
  meta: {
    docs: {
      description: "Keep page-flip implementation imports inside the owning adapter package.",
    },
    messages: {
      forbidden: "Only @booklet/flipbook-engine may import the page-flip implementation.",
    },
    schema: [],
    type: "problem",
  },
};

export { noPageFlipImportRule };
