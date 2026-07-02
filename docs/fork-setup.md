# Fork setup — services & secrets

The one-stop map of every external service a fork touches: what it's for, **where
each value lives**, and whether you need it for a basic app or only later. For the
per-variable "what breaks if missing" detail, see [`.env.example`](../.env.example).

**Tooling that fills these in for you:**

| Command | Does |
|---|---|
| `pnpm setup` | writes `.env.local`, generates `BETTER_AUTH_SECRET`, prompts for `DATABASE_URL` |
| `pnpm doctor` | shows which values are set + checks the DB connection / pending migrations |
| `pnpm setup-deeplinks` | substitutes the mobile universal-link values (see [Mobile](#mobile-eas--stores)) |

## Where values live

A value can live in more than one place depending on where the code runs:

- **`.env.local`** — local dev only (gitignored). `pnpm setup` writes it.
- **Replit Secrets** — the **deployed** app's runtime env (Replit → Tools →
  Secrets). Restart the workspace after adding — secrets aren't injected into
  already-running shells.
- **GitHub repo secrets** — only if you add a workflow that needs them. The
  **shipped CI needs none** (see [CI / deploy](#ci--deploy)).
- **EAS secrets** — mobile build/submit credentials (`eas secret:create`).

## Services

| Service | Value(s) | For | `.env.local` | Replit Secrets | Needed for | Where to get it |
|---|---|---|:---:|:---:|---|---|
| **Neon Postgres** | `DATABASE_URL` | the database | ✓ | ✓ | **core** (all persistence + auth) | [console.neon.tech](https://console.neon.tech) → Connection Details |
| **Better Auth** | `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` | sessions / auth | ✓ | ✓ | **core** | `pnpm setup` (or `openssl rand -base64 32`) |
| **Postmark** | `POSTMARK_SERVER_TOKEN`, `POSTMARK_FROM_EMAIL` | transactional email | ✓ | ✓ | **core** (verify email, password reset) | [account.postmarkapp.com](https://account.postmarkapp.com) → Servers → API Tokens; verify a Sender Signature |
| **Replit Object Storage** | `REPLIT_OBJECT_STORAGE_BUCKET_ID` | file uploads (avatars) | ✓ | ✓ | optional | Replit → Tools → Object Storage → create bucket |
| **Stripe** | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | payments / billing | ✓ | ✓ | advanced | [dashboard.stripe.com](https://dashboard.stripe.com) → Developers → API keys; `pnpm stripe:webhook-setup` |
| **Expo scheme** | `EXPO_SCHEME` | in-email deep links → app | ✓ | ✓ | optional (mobile) | your Expo `scheme` in `apps/mobile/app.config.ts` |
| **Replit dev domain** | `REPLIT_DEV_DOMAIN` | Replit preview cookies / CORS | — | auto-injected | auto (Replit only) | injected by Replit at runtime |
| **Claude Code auth** | `CLAUDE_CODE_OAUTH_TOKEN` *or* `ANTHROPIC_API_KEY` | run the mstack workflow in the cloud | — | ✓ | optional | `claude setup-token`, or [console.anthropic.com](https://console.anthropic.com) |

## Mobile (EAS / stores)

Advanced — only when you ship the mobile app to a store.

- **Universal-link values** — Apple Team ID, iOS bundle ID, Android package,
  Android **app-signing** SHA-256, and the deep-link host. Run
  **`pnpm setup-deeplinks`** — it substitutes them into
  `apps/web/public/.well-known/*` and `apps/mobile/app.config.ts` in one shot,
  with validation. After deploying, confirm from the wild with
  `pnpm verify:deeplinks -- https://<host>`. ⚠️ Use the **app-signing** key
  SHA-256, not the upload key, or Android verifies against the wrong key and
  links fall back to the browser.
- **Apple Developer Program** ($99/yr) + **Google Play Console** ($25) — store
  accounts; both can take up to ~48h to approve.
- **EAS secrets** — build/submit credentials (e.g. the Google service-account
  JSON) via `eas secret:create`. See
  [docs/handover/eas-submission.md](./handover/eas-submission.md).

## CI / deploy

- **Shipped CI** ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)) runs
  typecheck / lint / test / bundle-scan — **no secrets required**. (The bundle-scan
  job greps the mobile bundle for `DATABASE_URL`/`BETTER_AUTH_SECRET`/etc. to make
  sure server-only values never leak into it — it doesn't consume them.) Add repo
  secrets only if you add a workflow that hits real services (e.g. a deploy or
  DB-backed e2e job).
- **Deploy** (Replit Reserved VM) reads **Replit Secrets** at runtime. Full
  walkthrough: [docs/handover/replit-setup.md](./handover/replit-setup.md).

## Related

- [`.env.example`](../.env.example) — per-variable detail + "what breaks if missing".
- [docs/handover/replit-setup.md](./handover/replit-setup.md) — Replit Secrets + deploy.
- [docs/handover/eas-submission.md](./handover/eas-submission.md) — mobile store submission.
- [FORK_CHECKLIST.md.template](../FORK_CHECKLIST.md.template) — the per-fork checklist.
