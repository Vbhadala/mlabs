import { defineConfig, globalIgnores } from "eslint/config"
import mlabsNext from "@mlabs/eslint-config/next"

// Root ESLint config for the web app (src/). The shared MLabs preset bundles:
//   - eslint-config-next (core-web-vitals + typescript)
//   - The 3 MLabs custom rules: no-brand-string-literal, no-drizzle-in-schemas,
//     plus the no-raw-process-env restriction (enforced via no-restricted-syntax)
//
// The mlabs/* rules are activated by the preset for all files; we layer in
// path-scoped overrides below for env files that legitimately need process.env.

const eslintConfig = defineConfig([
  ...mlabsNext,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "tooling/eslint-config/src/rules/**", // rule source itself uses fs/path
    "mobile/**",                          // Expo app has its own linter via `expo lint`
    "packages/**",                        // packages have their own configs
  ]),
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
  // Build/test/CI scripts that legitimately need process.env. The t3-env
  // singleton is for app runtime; these run outside the validated env.
  {
    files: [
      "playwright.config.ts",
      "scripts/**/*.{ts,tsx,js,mjs}",
      "tests/**/*.{ts,tsx}",
      "vitest.config.ts",
    ],
    rules: { "no-restricted-syntax": "off" },
  },
])

export default eslintConfig
