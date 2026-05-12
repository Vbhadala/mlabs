// Pure-Zod schema barrel — shared by web (Next.js routes + RHF forms) and
// mobile (Expo client validation). NO Drizzle imports anywhere under this
// directory; eslint-rules/no-drizzle-in-schemas.js fails the build if any
// file in src/lib/schemas/ pulls in drizzle-orm.

export * from "./api-error"
export * from "./auth"
