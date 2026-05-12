// Transitional shim — wires up the @mlabs/db client factory with the app's
// env binding so existing callers can keep importing `db` from this path.
// Phase 5 (apps/web rewire) replaces these with a per-app composition root.

import { createDb, type Database } from "@mlabs/db/client"
import { env } from "@/config/env"

export const db = createDb({ databaseUrl: () => env.DATABASE_URL })
export type { Database }
export * from "@mlabs/db/schema"
