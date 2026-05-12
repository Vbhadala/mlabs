// Custom ESLint rule: ban drizzle-orm imports inside src/lib/schemas/.
//
// Phase 5.5 A4 — schemas under src/lib/schemas/ are pure Zod and meant for
// import by both web and mobile. A drizzle-orm import in there pulls the
// Node-only ORM into the mobile bundle, which then breaks at runtime. Catch
// it at lint time.

const SCHEMAS_PATH = /(?:^|[\\/])src[\\/]lib[\\/]schemas[\\/]/
const DRIZZLE_PREFIX = "drizzle-orm"

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow drizzle-orm imports inside src/lib/schemas/. Schemas there are pure Zod, shared by web + mobile.",
    },
    schema: [],
    messages: {
      noDrizzle:
        "Don't import '{{name}}' inside src/lib/schemas/. Schemas here are pure Zod (shared with mobile). Move Drizzle-aware code to a feature module.",
    },
  },
  create(context) {
    const filename = context.filename ?? context.getFilename()
    if (!SCHEMAS_PATH.test(filename)) return {}

    function check(node, name) {
      if (typeof name !== "string") return
      if (name === DRIZZLE_PREFIX || name.startsWith(`${DRIZZLE_PREFIX}/`)) {
        context.report({ node, messageId: "noDrizzle", data: { name } })
      }
    }

    return {
      ImportDeclaration(node) {
        check(node.source, node.source.value)
      },
      TSImportEqualsDeclaration(node) {
        const ref = node.moduleReference
        if (ref?.type === "TSExternalModuleReference") {
          check(ref.expression, ref.expression.value)
        }
      },
      CallExpression(node) {
        if (
          node.callee.type === "Identifier" &&
          node.callee.name === "require" &&
          node.arguments[0]?.type === "Literal"
        ) {
          check(node.arguments[0], node.arguments[0].value)
        }
      },
      // Dynamic `import("...")` — ImportExpression in ESTree.
      ImportExpression(node) {
        if (node.source?.type === "Literal") {
          check(node.source, node.source.value)
        }
      },
    }
  },
}
