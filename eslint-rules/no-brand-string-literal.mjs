// Custom ESLint rule: no string literal of the brand name outside an allowlist.
// Reads `brand.name` at lint time from src/config/brand.ts.
// Allowlisted paths can mention the brand verbatim (config/, templates/, legal/,
// translations/) — everywhere else must reference brand.name programmatically.
//
// Triggers on string literals AND template literals containing the brand string.

import fs from "node:fs"
import path from "node:path"

let cachedBrandName = null

function readBrandName(cwd) {
  if (cachedBrandName !== null) return cachedBrandName
  try {
    const brandFile = path.join(cwd, "src/config/brand.ts")
    const src = fs.readFileSync(brandFile, "utf8")
    const match = src.match(/name:\s*["']([^"']+)["']/)
    cachedBrandName = match ? match[1] : ""
  } catch {
    cachedBrandName = ""
  }
  return cachedBrandName
}

const ALLOW_PATTERNS = [
  /[\\/]src[\\/]config[\\/]/,
  /[\\/]templates[\\/]/,
  /[\\/]legal[\\/]/,
  /[\\/]translations[\\/]/,
  /[\\/]docs[\\/]/,
  /[\\/]e2e[\\/]/,         // tests legitimately import brand to assert against it
  /[\\/]tests[\\/]/,
  /[\\/]node_modules[\\/]/,
]

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow string literal of brand.name outside allowlisted paths. Use `brand.name` from @/config/brand instead.",
    },
    schema: [],
    messages: {
      noLiteral:
        "Don't hardcode the brand name '{{name}}'. Import { brand } from '@/config/brand' and use brand.name.",
    },
  },
  create(context) {
    const cwd = context.cwd ?? process.cwd()
    const brandName = readBrandName(cwd)
    if (!brandName) return {}

    const filename = context.filename ?? context.getFilename()
    if (ALLOW_PATTERNS.some((p) => p.test(filename))) return {}

    function check(node, value) {
      if (typeof value === "string" && value.includes(brandName)) {
        context.report({ node, messageId: "noLiteral", data: { name: brandName } })
      }
    }

    return {
      Literal(node) {
        check(node, node.value)
      },
      TemplateElement(node) {
        check(node, node.value?.cooked)
      },
    }
  },
}
