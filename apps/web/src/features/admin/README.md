# features/admin

Admin console: list users, change roles, ban/unban, send password resets,
post one-off notifications, browse audit log. Composes:

- `lib/auth` — `requireAdmin()` gates every entry point; non-admins get 404.
- `lib/db` — extends the `user` table with `role`, `banned_at`,
  `banned_reason`. Migration `0004_*`. Uses `audit()` BEFORE every mutation.
- `lib/email` — `sendPasswordReset` action delegates to Better Auth's
  `forgetPassword` (W3-wired Postmark).
- `features/notifications` — admin-to-user notification uses
  `createNotification` with `kind: "generic"`.

## Routes

- `/admin/users` — paginated list with search + role/banned filters
- `/admin/users/[id]` — user detail + role/ban/notify controls + scoped audit
- `/admin/audit` — global recent audit entries, date filter

All gated by `(admin)/layout.tsx` which calls `requireAdmin()`.

## Bootstrap

Sign up normally, then promote yourself with the CLI script:

```bash
pnpm make-admin you@example.com   # promote a specific user by email
pnpm make-admin                   # no arg → promote the earliest-created user
```

The script (`packages/db/scripts/make-admin.ts`) sets `role='admin'`
directly against `DATABASE_URL`. It's idempotent and re-runnable — no
deploy-time env ordering, no lockout if you sign up before configuring
anything. After the first admin exists, subsequent promotions happen
in-app on the user detail page.

## Action semantics (audit BEFORE mutation)

| Action | Guards |
|---|---|
| `changeRole` | Cannot self-demote; cannot demote the last admin. |
| `banUser` | Cannot ban yourself. Atomic `db.batch`: audit + UPDATE `banned_at` + DELETE all sessions for the user. |
| `unbanUser` | Clears `banned_at`. User must sign in again. |
| `sendPasswordResetTo` | Calls Better Auth's `forgetPassword` server-side. |
| `sendAdminNotification` | Validates title/message non-empty; creates a `generic`-kind notification on the target. |

Banned users:

1. Cannot create a new session (`databaseHooks.session.create.before`
   throws on `banned_at NOT NULL`).
2. Have all existing sessions deleted at ban time — cookies become
   invalid on the next request.

## To remove this feature

```bash
rm -rf src/features/admin
rm -rf 'src/app/(admin)'
# In src/lib/auth/index.ts — drop the databaseHooks block + additionalFields,
#   OR (preferable) leave additionalFields in place but stop reading role.
# In src/lib/auth/server.ts — remove requireAdmin() or keep as no-op.
# In src/lib/db/schema/auth.ts — keep role/banned_at columns; harmless when
#   the admin UI is gone, removing them needs a destructive migration.
# In src/lib/db/audit.ts — keep AuditMeta variants; removing them needs
#   coordinated changes across audit_log rows.
```

No env var is required for v1 functionality — admin bootstrap is a manual
`pnpm make-admin` step.
