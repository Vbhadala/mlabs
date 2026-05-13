# Postmark templates

The MLabs template ships with **typed wrappers** for three transactional emails. The
template content (subject, HTML, plaintext, design) lives in **Postmark's UI**, not in
this repo. Clients can edit copy without touching code — that's the whole point.

This doc tells you what to set up in Postmark UI for each fork.

## Per-fork setup checklist

For each new fork (per the template's per-project Postmark strategy):

1. **Create a new Server** in [Postmark](https://account.postmarkapp.com/servers)
   (one per project — never share servers across clients)
2. **Add a Sender Signature** for your `From` address (must be verified)
3. Copy the Server's **API Token** to `POSTMARK_SERVER_TOKEN` in Replit Secrets
4. Set `POSTMARK_FROM_EMAIL` to the verified sender email
5. **Create the three templates below** with their exact aliases and variables

If you skip step 5, signups will succeed but verify-email and password-reset sends will
return a Postmark error — surfaced in the UI as a retry-able message.

## Templates

### 1. `verify-email`

**When:** sent to a new user immediately after signup (Better Auth's
`emailVerification.sendOnSignUp`).

**Required variables:**

| Variable | Type | Example |
|---|---|---|
| `brand_name` | string | "MLabs" |
| `name` | string | user's display name |
| `verify_url` | URL | one-shot verify link (Better Auth issues; expires per template config) |

**Suggested content:**
- **Subject:** `Verify your email for {{ brand_name }}`
- **Body:** "Hi {{ name }}, click the button below to confirm your email…" + CTA → `{{ verify_url }}`

### 2. `password-reset`

**When:** sent when a user submits the `/forgot-password` form.

**Required variables:**

| Variable | Type | Example |
|---|---|---|
| `brand_name` | string | "MLabs" |
| `name` | string | user's display name |
| `reset_url` | URL | one-shot reset link |
| `expires_in_minutes` | number | `60` (default; pass to wrapper to override) |

**Suggested content:**
- **Subject:** `Reset your {{ brand_name }} password`
- **Body:** "We received a request to reset the password for your account. The link expires in {{ expires_in_minutes }} minutes." + CTA → `{{ reset_url }}` + "If you didn't request this, ignore this email."

### 3. `notification-generic`

**When:** any feature that wants to email the user about an in-app notification (used by
`features/notifications` once W6 lands).

**Required variables:**

| Variable | Type | Example |
|---|---|---|
| `brand_name` | string | "MLabs" |
| `title` | string | "Bet settled" |
| `body` | string | "Your bet on team X just settled. Tap to view." |
| `cta_label` | string (may be empty) | "View bet" |
| `cta_url` | URL (may be empty) | link |

**Suggested content:**
- **Subject:** `{{ title }} — {{ brand_name }}`
- **Body:** show `{{ body }}`, with optional CTA button if `{{#if cta_label}}{{ cta_label }}{{/if}}`

## Adding a new template

1. **In Postmark:** Servers → Your Server → Templates → New Template. Name it,
   pick a sensible alias (e.g. `welcome-bonus`), and design.
2. **In code:** add a typed wrapper to `src/lib/email/templates.ts` mirroring the
   existing wrappers. The variable shape must match what the Postmark template uses.
3. **Update this doc** with the new template's variable table — that's what the
   client-side template editor (in Postmark) needs to know.

## Dev fallback

If `POSTMARK_SERVER_TOKEN` is unset (e.g. local dev without Postmark setup), the
email module silently switches to the **console driver** — emails are logged to
the server console rather than sent. Verify URLs and reset URLs appear in the log
so devs can complete the auth flow without provisioning Postmark first.

This is automatic — no code change needed. To force production behaviour locally,
just set the env var.

## Handover

When transferring a project to a client (per `HANDOVER.md` — TODO):

- The client either inherits your Postmark Server (you transfer ownership in Postmark UI)
  or creates their own and replaces `POSTMARK_SERVER_TOKEN`. Either way, no code change.
- Templates transfer with the Server (no migration needed).
- Sender Signatures need re-verification if the From address changes.
