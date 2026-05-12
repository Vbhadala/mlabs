// Schema barrel — re-exports from @mlabs/validators plus the Next-specific
// apiError() helper from ./api-error. Kept as a thin wrapper to avoid
// breaking existing @/lib/schemas imports during the monorepo migration.

export * from "@mlabs/validators";
export { apiError } from "./api-error";
