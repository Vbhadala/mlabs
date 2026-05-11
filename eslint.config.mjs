import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"
import noBrandStringLiteral from "./eslint-rules/no-brand-string-literal.mjs"

const mlabsRules = {
  plugins: {
    mlabs: { rules: { "no-brand-string-literal": noBrandStringLiteral } },
  },
  rules: {
    // No raw process.env access outside src/config/env.ts. Forces all env reads through
    // the t3-env validated singleton.
    "no-restricted-syntax": [
      "error",
      {
        selector:
          "MemberExpression[object.object.name='process'][object.property.name='env']",
        message:
          "Don't access process.env directly. Import { env } from '@/config/env' instead.",
      },
      {
        selector: "MemberExpression[object.name='process'][property.name='env']",
        message:
          "Don't access process.env directly. Import { env } from '@/config/env' instead.",
      },
    ],
    "mlabs/no-brand-string-literal": "error",
  },
}

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "eslint-rules/**",       // the rule source itself uses fs/path
  ]),
  // Apply MLabs custom rules everywhere except where exempt
  {
    files: ["src/**/*.{ts,tsx,js,jsx}", "app/**/*.{ts,tsx,js,jsx}"],
    ...mlabsRules,
  },
  // Carve out the env config — it's the ONE place process.env is allowed
  {
    files: ["src/config/env.ts"],
    rules: { "no-restricted-syntax": "off" },
  },
  // Carve out drizzle config + next config — they need process.env at boot
  {
    files: ["drizzle.config.ts", "next.config.ts"],
    rules: { "no-restricted-syntax": "off" },
  },
])

export default eslintConfig
