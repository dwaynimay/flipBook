/**
 * @param {unknown} value
 * @returns {value is Readonly<Record<string, unknown>>}
 */
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * @param {unknown} value
 * @param {boolean} [insideChain]
 * @returns {boolean}
 */
function containsUnknownAssertion(value, insideChain = false) {
  if (!isRecord(value)) {
    return false;
  }

  if (
    (value.type === "TSAsExpression" || value.type === "TSTypeAssertion") &&
    isRecord(value.typeAnnotation) &&
    value.typeAnnotation.type === "TSUnknownKeyword"
  ) {
    return true;
  }

  if (
    value.type === "ChainExpression" ||
    value.type === "ParenthesizedExpression" ||
    value.type === "TSNonNullExpression"
  ) {
    return containsUnknownAssertion(
      value.expression,
      insideChain || value.type === "ChainExpression",
    );
  }

  if (insideChain && value.type === "CallExpression") {
    return containsUnknownAssertion(value.callee, true);
  }

  if (insideChain && value.type === "MemberExpression") {
    return containsUnknownAssertion(value.object, true);
  }

  return false;
}

/** @type {import("eslint").Rule.RuleModule} */
const noUnsafeDoubleAssertionRule = {
  create(context) {
    return {
      /**
       * @param {import("eslint").Rule.Node & { readonly expression?: unknown }} node
       * @returns {void}
       */
      TSAsExpression(node) {
        if (containsUnknownAssertion(node.expression)) {
          context.report({
            messageId: "forbidden",
            node,
          });
        }
      },
      /**
       * @param {import("eslint").Rule.Node & { readonly expression?: unknown }} node
       * @returns {void}
       */
      TSTypeAssertion(node) {
        if (containsUnknownAssertion(node.expression)) {
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
      description: "Disallow double assertions that bypass type safety through unknown.",
    },
    messages: {
      forbidden: "Double assertions through unknown are forbidden; validate or narrow the value.",
    },
    schema: [],
    type: "problem",
  },
};

export { noUnsafeDoubleAssertionRule };
