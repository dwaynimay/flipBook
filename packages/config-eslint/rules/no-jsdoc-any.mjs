import typescript from "typescript";

const jsdocTagPattern = /@([A-Za-z][A-Za-z0-9_-]*)\b/gu;
const freeformContentTags = new Set([
  "description",
  "example",
  "remarks",
  "see",
  "summary",
  "todo",
]);

/**
 * @param {string} commentValue
 * @returns {readonly string[]}
 */
function extractTypeExpressions(commentValue) {
  const expressions = [];

  for (const match of commentValue.matchAll(jsdocTagPattern)) {
    const matchIndex = match.index ?? 0;
    const tagName = (match[1] ?? "").toLowerCase();

    if (commentValue[matchIndex - 1] === "{" || freeformContentTags.has(tagName)) {
      continue;
    }

    let cursor = matchIndex + match[0].length;

    while (/\s/u.test(commentValue[cursor] ?? "")) {
      cursor += 1;
    }

    if (commentValue[cursor] !== "{") {
      continue;
    }

    const expressionStart = cursor + 1;
    let depth = 1;
    let quote = "";
    let escaped = false;

    for (cursor = expressionStart; cursor < commentValue.length; cursor += 1) {
      const character = commentValue[cursor] ?? "";

      if (quote !== "") {
        if (escaped) {
          escaped = false;
        } else if (character === "\\") {
          escaped = true;
        } else if (character === quote) {
          quote = "";
        }

        continue;
      }

      if (character === '"' || character === "'" || character === "`") {
        quote = character;
      } else if (character === "{") {
        depth += 1;
      } else if (character === "}") {
        depth -= 1;

        if (depth === 0) {
          expressions.push(commentValue.slice(expressionStart, cursor));
          break;
        }
      }
    }
  }

  return expressions;
}

/**
 * @param {string} typeExpression
 * @returns {boolean}
 */
function containsAnyType(typeExpression) {
  const sourceFile = typescript.createSourceFile(
    "jsdoc-type.ts",
    `type BookletJSDocType = ${typeExpression};`,
    typescript.ScriptTarget.Latest,
    true,
    typescript.ScriptKind.TS,
  );
  let foundAny = false;

  /**
   * @param {import("typescript").Node} node
   * @returns {void}
   */
  function visit(node) {
    if (node.kind === typescript.SyntaxKind.AnyKeyword) {
      foundAny = true;
      return;
    }

    if (!foundAny) {
      typescript.forEachChild(node, visit);
    }
  }

  visit(sourceFile);
  return foundAny;
}

/** @type {import("eslint").Rule.RuleModule} */
const noJsdocAnyRule = {
  create(context) {
    return {
      Program(node) {
        for (const comment of context.sourceCode.getAllComments()) {
          if (
            comment.type !== "Block" ||
            !comment.value.startsWith("*") ||
            !extractTypeExpressions(comment.value).some(containsAnyType)
          ) {
            continue;
          }

          if (comment.loc === null || comment.loc === undefined) {
            context.report({
              messageId: "forbidden",
              node,
            });
          } else {
            context.report({
              loc: comment.loc,
              messageId: "forbidden",
              node,
            });
          }
        }
      },
    };
  },
  meta: {
    docs: {
      description: "Disallow any in all supported JSDoc type expressions.",
    },
    messages: {
      forbidden: "JSDoc type expressions must not contain the any type.",
    },
    schema: [],
    type: "problem",
  },
};

export { noJsdocAnyRule };
