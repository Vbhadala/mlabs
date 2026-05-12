import "server-only"

// Users operations. Phase 4 covers only deleteAccount; PATCH /api/profile
// (name) and POST /api/profile/password stay route-direct in this phase —
// both lean on Better Auth's request-context API (auth.api.updateUser /
// changePassword take a Headers object) and the cleaner boundary is to
// reshape those during the apps/web rewire in Phase 5.

import { z } from "zod"
import { users } from "@mlabs/services"
import { defineOperation } from "./index"

export const deleteAccountOp = defineOperation({
  name: "users.deleteAccount",
  input: z.object({}).strict(),
  output: z.object({
    ok: z.literal(true),
    previousImage: z.string().nullable(),
  }),
  permission: "user",
  handler: async (db, ctx) => users.deleteAccount(db, ctx),
})
