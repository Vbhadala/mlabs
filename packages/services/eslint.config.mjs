import library from "@mlabs/eslint-config/library"

// Cross-domain import boundary for @mlabs/services.
//
// Inside src/<domain>/* a file can import:
//   - other files in the same domain (./*, ./service, ./index)
//   - the public surface of another domain via @mlabs/services/<other>
//   - external packages (@mlabs/db, drizzle-orm, etc.)
//
// It CANNOT reach into another domain's internals:
//   ❌ import { x } from "../audit/service"
//   ❌ import { x } from "@mlabs/services/audit/service" (no such export)
//
// The rule is scoped to src/notifications, src/messages, etc. as those land.

const crossDomainBlocks = [
  // Add a tuple per domain pair as new domains land. The first entry is
  // illustrative — single-domain state means there's nothing to block yet,
  // but the policy is documented so it can be picked up immediately when a
  // second domain arrives (e.g. messages reaching into audit/).
  {
    files: ["src/notifications/**/*.ts"],
    forbidden: ["../audit/*", "../messages/*", "../users/*"],
  },
]

export default [
  ...library,
  ...crossDomainBlocks.map(({ files, forbidden }) => ({
    files,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: forbidden.map((p) => ({
            group: [p],
            message:
              "Cross-domain imports must go through @mlabs/services/<domain> (the public surface), not reach into another domain's files.",
          })),
        },
      ],
    },
  })),
]
