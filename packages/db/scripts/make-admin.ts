// make-admin — promote a user to the "admin" role.
//
// Replaces the old INITIAL_ADMIN_EMAIL env-at-signup bootstrap. That
// mechanism required the email to be set in the deploy env *before* that
// user signed up; set it late, sign up first, or typo the address and you
// were locked out with no admin and had to hand-edit the DB. This script is
// explicit and re-runnable: sign up normally, then grant admin whenever.
//
// Usage:
//   pnpm make-admin user@example.com   # promote a specific user by email
//   pnpm make-admin                    # no arg → promote the earliest-created user
//
// Requires DATABASE_URL. Uses the same neon-serverless Pool driver as
// scripts/migrate.ts (see that file for the driver rationale).

import { drizzle } from "drizzle-orm/neon-serverless"
import { Pool, neonConfig } from "@neondatabase/serverless"
import { asc, eq, sql } from "drizzle-orm"
import ws from "ws"
import { user } from "../src/schema"

neonConfig.webSocketConstructor = ws

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error("DATABASE_URL is required to promote a user.")
  process.exit(1)
}

// Optional positional arg: the email to promote. Absent → earliest signup.
const emailArg = process.argv[2]?.trim()

const pool = new Pool({ connectionString: databaseUrl })
const db = drizzle({ client: pool })

try {
  // Resolve the target user: by email (case-insensitive) if given, else the
  // earliest-created row (the first person who signed up).
  const [target] = emailArg
    ? await db
        .select({ id: user.id, email: user.email, role: user.role })
        .from(user)
        .where(sql`lower(${user.email}) = lower(${emailArg})`)
        .limit(1)
    : await db
        .select({ id: user.id, email: user.email, role: user.role })
        .from(user)
        .orderBy(asc(user.createdAt))
        .limit(1)

  if (!target) {
    console.error(
      emailArg
        ? `No user found with email "${emailArg}". Sign up first, then re-run.`
        : "No users exist yet. Sign up first, then re-run `pnpm make-admin`.",
    )
    process.exit(1)
  }

  if (target.role === "admin") {
    console.log(`✓ ${target.email} is already an admin — nothing to do.`)
  } else {
    await db.update(user).set({ role: "admin" }).where(eq(user.id, target.id))
    console.log(`✓ Promoted ${target.email} to admin.`)
  }
} finally {
  // Without pool.end() the Node process hangs — the pool's open sockets keep
  // the event loop alive.
  await pool.end()
}
