// @mlabs/eslint-config/no-server-imports
//
// Flat-config block that forbids a client/mobile bundle from importing
// server-only workspace packages — the last line of defense against shipping
// DATABASE_URL / BETTER_AUTH_SECRET into a client bundle, on top of package.json
// deps and the CI bundle-scan.
//
// Single source of truth: consumed by both the Expo preset (./expo) and the
// mobile app's flat config, so the ban can't drift. (It previously lived only
// in ./expo, which the mobile app never actually consumed — the ban was dead.)

/** @type {import("eslint").Linter.Config} */
const noServerImports = {
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: [
              "@mlabs/db",
              "@mlabs/db/*",
              "@mlabs/services",
              "@mlabs/services/*",
              "@mlabs/email",
              "@mlabs/email/*",
              "@mlabs/auth/server",
              "@mlabs/auth/server/*",
              "@mlabs/auth/jwt",
              "@mlabs/api/server",
              "@mlabs/api/server/*",
              "server-only",
            ],
            message:
              "Server-side package — not allowed in a client/mobile bundle. Import shared schemas/types from @mlabs/validators or @mlabs/api (client subpaths) instead.",
          },
        ],
      },
    ],
  },
}

export default noServerImports
