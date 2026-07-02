// Mobile ESLint flat config — eslint-config-expo's flat preset (RN + expo-router
// + React rules tuned for the installed Expo SDK) plus the shared
// no-server-imports ban, so the mobile bundle can't pull in server-only
// workspace packages (@mlabs/db, @mlabs/services, @mlabs/email, …).

import { createRequire } from "node:module"
import noServerImports from "@mlabs/eslint-config/no-server-imports"

// eslint-config-expo/flat is a CJS directory export with no ESM "exports" map,
// so a bare ESM `import` can't resolve it — use CJS require (like the old config).
const require = createRequire(import.meta.url)
const expoConfig = require("eslint-config-expo/flat")

export default [
  ...expoConfig,
  {
    ignores: ["node_modules/**", ".expo/**", "ios/**", "android/**", "dist/**"],
  },
  {
    rules: {
      // React Native renders <Text> children as plain strings via the JS engine,
      // not HTML — the `'`/`"` quote-escape concern this rule exists for doesn't
      // apply. Keeps user-facing copy like "you're" / "we'll" readable in source.
      "react/no-unescaped-entities": "off",
    },
  },
  // Last line of defense — must come after the preset so it isn't overridden.
  noServerImports,
]
