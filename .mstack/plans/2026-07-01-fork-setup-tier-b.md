# Plan: Tier B — fork-setup bundle (deeplinks + secrets doc)

**Date:** 2026-07-01
**Slug:** fork-setup-tier-b
**Status:** implemented
**Author:** Claude (via /mstack-plan)

---

## Problem

Two fork-setup pain points from the DX review (continuing Tier A first-run-dx):

1. **Deep-link substitution is manual and silently fatal.** A fork must hand-edit
   `{{APPLE_TEAM_ID}}`/`{{IOS_BUNDLE_ID}}` in the AASA file,
   `{{ANDROID_PACKAGE}}`/`{{ANDROID_CERT_SHA256}}` in `assetlinks.json`, **and**
   the literal `com.example.mlabs` / `applinks:mlabs.example.com` in
   `app.config.ts`. Miss one — or paste the upload-key SHA instead of the
   app-signing SHA — and universal links silently fall back to the browser;
   users never retry in-app. There's a read-side `pnpm verify:deeplinks` but no
   write-side.
2. **Secrets/services guidance is scattered** across `.env.example`,
   `docs/handover/replit-setup.md`, `FORK_CHECKLIST.md.template`, and
   `HANDOVER.md.template` — no single "what do I need, and where does each value
   go" map.

**Who benefits:** forkers shipping mobile + deploying. **Success:** one command
substitutes every deep-link value with validation, and one doc answers "which
services + secrets, and where each lives."

Layout: monorepo, pnpm, mobile present (resolved). Tooling + docs only — **no
product code**. (Skipping local Postgres per user — Neon is fine.)

## Scope

**In:**
- **`pnpm setup-deeplinks`** (`scripts/setup-deeplinks.ts`) — zero-dep readline
  wizard (async `main()`, reusing the `scripts/setup.ts` pattern). Prompts for
  5 values with validation, then rewrites all 3 files in one shot:
  - Apple Team ID — `^[A-Z0-9]{10}$`
  - iOS bundle ID — reverse-domain
  - Android package — reverse-domain (default = iOS bundle)
  - Android cert **app-signing** SHA-256 — `^([0-9A-Fa-f]{2}:){31}[0-9A-Fa-f]{2}$`
    (reuse the shape from `scripts/verify-deeplinks.ts`); prompt copy warns
    "app-signing key, NOT upload key".
  - Deep-link host — hostname shape (e.g. `app.acme.com`)
  Pure substitution helpers extracted + unit-tested (like `env-doctor`). Idempotent
  (detects already-substituted → no-op + message). Composes with the existing
  `verify:deeplinks` (prints a reminder to run it post-deploy; does not auto-run —
  that needs a live URL).
- **`docs/fork-setup.md`** — canonical services+secrets map. One table: service →
  purpose → where the value goes (`.env.local` / Replit Secrets / GitHub secrets /
  EAS secrets) → basic vs advanced → where to obtain it. Covers Neon, Better Auth,
  Postmark, Replit Object Storage, Stripe, Replit deploy, GitHub CI, EAS/Apple/
  Google. References the `pnpm setup` / `doctor` / `setup-deeplinks` tooling.
- **Cross-links** from `README.md` + `FORK_CHECKLIST.md.template` (point to the
  new doc + script; replace the manual `.well-known` edit steps with
  `pnpm setup-deeplinks`).
- `package.json` — add the `setup-deeplinks` script.

**Out (deferred):**
- Local Postgres / docker-compose (dropped — Neon only).
- Auto-running `verify:deeplinks` (needs a deployed URL).
- Deleting the inline `.env.example` per-var comments (they stay; the doc links to them).
- Any change to how `.well-known` is *served* (only substitutes the source files).

## Approach

**Chosen — a write-side wizard mirroring Tier A + a linked canonical doc.**
`scripts/setup-deeplinks.ts` follows the established root-script pattern
(`doctor.ts`/`setup.ts`: tsx, CJS async `main()`, ANSI helpers, `isDirectRun`
guard, TTY-aware). The `.well-known` JSON files are `{{PLACEHOLDER}}`
string-replaces; `app.config.ts` needs **field-targeted** replacement
(`bundleIdentifier:` line → bundle, `package:` line → package, `applinks:` host →
deep-link host) because it ships literal example values, not `{{}}`, and iOS
bundle ≠ Android package is allowed. Substitution logic is pure functions
(`substituteAasa`, `substituteAssetlinks`, `substituteAppConfig`) so they're
unit-tested in `apps/web/tests/` (the `env-doctor` precedent — `@mlabs/config`
et al. have no runner). `docs/fork-setup.md` is a new file; README/FORK_CHECKLIST
link to it rather than duplicating.

**Alternatives considered:**
- **Flag-based / non-interactive script** — rejected: these are one-time
  human-entered values; interactive prompts with inline validation catch the
  SHA/Team-ID footguns better. (Non-TTY → error with instructions, no guessing.)
- **Regenerate `.well-known` from `app.config.ts` at build time** — rejected as
  out of scope; bigger change to the serving path, and the static files + the
  read-side verifier already exist.

## Data model changes

None.

## Files to touch

**New:**
- `scripts/setup-deeplinks.ts` — the wizard + pure substitution helpers.
- `apps/web/tests/setup-deeplinks.test.ts` — unit tests for the pure helpers.
- `docs/fork-setup.md` — canonical services + secrets map.

**Edit:**
- `package.json` — add `"setup-deeplinks": "tsx scripts/setup-deeplinks.ts"`.
- `apps/web/public/.well-known/apple-app-site-association` — (script rewrites at runtime; not a source edit)
- `README.md` — link to `docs/fork-setup.md`; mention `pnpm setup-deeplinks`.
- `FORK_CHECKLIST.md.template` — replace the manual `.well-known` / `app.config.ts`
  substitution steps with `pnpm setup-deeplinks`; link `docs/fork-setup.md`.

## Edge cases

- **Already substituted** (re-run): no `{{}}` and no `com.example.mlabs` left →
  report "already configured", make no changes, exit 0.
- **iOS bundle ≠ Android package** — prompt both; field-targeted replacement so
  they don't collide.
- **app.config.ts example value changed** (fork already partly edited) → the
  targeted regex won't match; warn "app.config.ts didn't match the expected
  template value — check it manually" rather than silently doing nothing.
- **Malformed input** — reject + re-prompt (Team ID length, SHA shape, hostname).
- **Non-TTY** — error with the exact values needed + doc link; exit non-zero.
- **Test fixtures** (`apps/web/tests/fixtures/**`) and build copies
  (`apps/web/.next/**`) contain the same placeholders — the script must only
  touch the real source files, never those.
- **Upload-key vs app-signing-key SHA** — the #1 real footgun; prompt copy calls
  it out explicitly.

## Acceptance criteria

- [ ] `pnpm setup-deeplinks` with valid inputs rewrites all 3 files; afterward a
      grep finds no `{{APPLE_TEAM_ID}}`/`{{IOS_BUNDLE_ID}}`/`{{ANDROID_PACKAGE}}`/
      `{{ANDROID_CERT_SHA256}}` and no `com.example.mlabs` / `mlabs.example.com`
      in the three source files.
- [ ] Invalid Team ID / SHA-256 / hostname is rejected (re-prompt), not written.
- [ ] Re-running when already substituted makes no changes and says so.
- [ ] Pure substitution helpers are unit-tested (valid + idempotent + no-match).
- [ ] `pnpm verify:deeplinks` structural validation still passes on the rewritten
      files (the two sides compose).
- [ ] `docs/fork-setup.md` has a single table mapping every service → value
      destination → basic/advanced; README + FORK_CHECKLIST link to it.
- [ ] `pnpm typecheck` + `pnpm lint` pass; no new deps.

## Open questions

For the reviewer (`/mstack-review`) to resolve before implementation.

- **Serving path:** `apps/web/src/app/.well-known/[file]/route.ts` exists — does
  the app serve AASA/assetlinks from the static `public/.well-known/*` files, or
  does that route generate them dynamically (from `app.config.ts`/env)? If
  dynamic, confirm the static files are still the substitution source (or retarget
  the script). **Must resolve before coding the file writes.**
- **Helper location:** pure substitution helpers in `scripts/setup-deeplinks.ts`
  with the test importing them from there, or a shared module? (env-doctor put the
  pure part in a package; here the logic is script-local — confirm test can import
  from `scripts/`.)
- **FORK_CHECKLIST:** replace the manual steps entirely with the script, or keep
  them as a documented fallback under the script?
