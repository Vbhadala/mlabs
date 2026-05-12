// Transitional shim — schema moved to @mlabs/db. Phase 5 (apps/web rewire)
// will rewrite callers to import from @mlabs/db/schema directly and delete
// this file. Kept for now so test mocks at @/lib/db/schema/auth still match.
export {
  user,
  session,
  account,
  verification,
  userRelations,
  sessionRelations,
  accountRelations,
} from "@mlabs/db/schema"
