# Plan: Replit fork hardening (Tailwind scan + Better Auth trustedOrigins + Next.js HMR)

**Date:** 2026-05-26
**Slug:** 2026-05-26-replit-fork-hardening
**Status:** implemented
**Author:** framer@millionlabs.co.uk

---

## Problem

Three infra-level gaps in the base template that hit **every** fresh fork the
moment it boots on Replit (and two of them also affect any non-Replit deploy on
a custom domain). Surfaced during a fork review (`.context/attachments/HnDasa/image.png`)
and confirmed against this repo:

1. **Tailwind v4 doesn't scan workspace packages.**
   `apps/web/src/app/globals.css` has no `@source` directives. Tailwind v4
   auto-scans `apps/web/` but explicitly skips `node_modules` — which is what
   pnpm symlinks `packages/ui-web/src/**` (and any future JSX-shipping
   workspace package) resolve to. Forks adding `<Button>` / `<Field>` /
   `<PasswordInput>` from `@mlabs/ui-web` see Tailwind classes silently
   purged from the build. Visual regression with no error.

2. **Better Auth has no `trustedOrigins` wiring.**
   `packages/auth/src/server.ts` `CreateAuthOptions` does not accept
   `trustedOrigins`, and `apps/web/src/lib/auth/index.ts` doesn't supply one.
   Better Auth's default is to validate the request `Origin` header against
   `baseURL` — on Replit, the server runs at `localhost:5000` while the
   browser hits `https://<replit-domain>`, so every `/api/auth/*` call
   responds `403 "Invalid origin"`. Custom-domain deploys and ngrok previews
   hit the same wall.

3. **Next.js `allowedDevOrigins` misses newer Replit cluster wildcards.**
   `apps/web/next.config.mjs` lists `*.replit.dev`, `*.repl.co`,
   `*.worf.replit.dev`. Replit's newer workspace domains are two levels deep
   (e.g. `<id>.kirk.replit.dev`), and `*` is a single-level wildcard. Forks
   in the new cluster see the Next.js 16 "cross-origin dev request"
   warning on every HMR ping; some get hard-blocked depending on Next's
   version-by-version policy.

**Who benefits:** every future fork's day-1 experience. These are bugs the
template should swallow once so individual MVPs don't pay them again.

## Scope

**In:**
- Add `@source` directives to `apps/web/src/app/globals.css` covering
  all workspace packages that could ship Tailwind-classed JSX
  (glob: `packages/*/src/**/*.{ts,tsx}`).
- Add `trustedOrigins?: string[]` to `CreateAuthOptions` in
  `packages/auth/src/server.ts`; pass through to `betterAuth({ trustedOrigins })`.
- In `apps/web/src/lib/auth/index.ts`, assemble the trustedOrigins list from
  `BETTER_AUTH_URL`, `http://localhost:3000`, `http://localhost:5000`,
  and `https://${env.REPLIT_DEV_DOMAIN}` when set. Composition-root only
  (no new env var).
- Add `*.kirk.replit.dev` to `allowedDevOrigins` in `apps/web/next.config.mjs`,
  and dynamically append `process.env.REPLIT_DEV_DOMAIN` when defined.
- One unit test in `apps/web/tests/` that exercises a pure helper
  `buildTrustedOrigins(env)` and asserts the expected list across the
  three permutations (Replit-only env, BETTER_AUTH_URL-only env, both set).
- Documentation: short note in `docs/template/TEMPLATE.md` (or the lessons
  file it references) about why each piece exists, so future forks don't
  "clean up" the Replit-specific entries.

**Out (deferred):**
- Items 1, 2, 4, 5 from the fork review — auth/login design-system tweaks
  and app-specific copy. Per the user's own classification, these stay in
  the fork, not the template.
- Adding a new env var like `BETTER_AUTH_TRUSTED_ORIGINS` for fork-time
  custom domains. Picked the boring composition-root list; revisit only
  when a fork hits a real custom-domain trustedOrigins wall.
- Replacing the hardcoded Replit cluster wildcards with a recursive
  `**.replit.dev`-style match. Surgical addition only.
- Touching `packages/auth` test setup (no vitest devDep there yet). The
  test goes in `apps/web/tests/` where vitest is already wired.
- Any change to `apps/mobile` — Expo doesn't share the Next/Tailwind/HMR
  surfaces involved here.

## Approach

**Chosen path: one PR, three commits, surgical.**

The three fixes are independent in scope but share a single theme ("the
template should boot cleanly on a fresh Replit fork") and the same blast
radius (infra files only, zero behavior change for users on a non-Replit
prod deploy who already had `BETTER_AUTH_URL` set). Bundling them keeps
the rename/changelog/review noise low.

**Commit 1 — Tailwind `@source` for workspace packages.**
Add to `apps/web/src/app/globals.css`:
```css
@source "../../../../packages/*/src/**/*.{ts,tsx}";
```
This is a glob, not a per-package list — future-proof when we add a
`packages/ui-marketing` or similar. Tailwind v4's `@source` directive is
exactly the v4 equivalent of v3's `content:` and accepts globs relative
to the CSS file. Verify locally by running `pnpm --filter @mlabs/web build`
and checking a `<Button variant="ghost">`-style class survives in the
emitted CSS.

**Commit 2 — Better Auth `trustedOrigins`.**
Two-file change:

`packages/auth/src/server.ts` — extend the interface and pass through:
```ts
export interface CreateAuthOptions {
  // ...existing fields
  /** Optional. Allowed Origin headers for /api/auth/*. Required when the
   *  browser hits a different host than the server's baseURL — Replit
   *  preview, ngrok, custom domains. Better Auth 403s without it. */
  trustedOrigins?: string[]
}

const auth = betterAuth({
  // ...existing,
  trustedOrigins,
})
```

`apps/web/src/lib/auth/index.ts` — assemble via a new pure helper kept
co-located:
```ts
function buildTrustedOrigins(input: {
  betterAuthUrl?: string
  replitDevDomain?: string
}): string[] {
  const list = new Set<string>([
    "http://localhost:3000",
    "http://localhost:5000",
  ])
  if (input.betterAuthUrl) list.add(input.betterAuthUrl)
  if (input.replitDevDomain) list.add(`https://${input.replitDevDomain}`)
  return [...list]
}
```
…and pass the result into `createAuth({ trustedOrigins })`.

We deliberately do NOT introduce a `BETTER_AUTH_TRUSTED_ORIGINS` env var —
the existing `BETTER_AUTH_URL` already covers the custom-domain case, and
the Replit case is covered by the existing `REPLIT_DEV_DOMAIN` Replit
injects automatically.

**Commit 3 — Next.js `allowedDevOrigins` for new Replit clusters.**
`apps/web/next.config.mjs`:
```js
allowedDevOrigins: [
  "127.0.0.1",
  "*.replit.dev",
  "*.repl.co",
  "*.worf.replit.dev",
  "*.kirk.replit.dev",                     // newer two-level cluster domains
  ...(process.env.REPLIT_DEV_DOMAIN ? [process.env.REPLIT_DEV_DOMAIN] : []),
].filter(Boolean),
```
Minimal: keeps existing entries intact (don't churn what works), adds the
specific cluster wildcard the fork review caught, and the dynamic
`REPLIT_DEV_DOMAIN` push so even an unknown future cluster suffix
self-heals as long as Replit sets the env var.

**Alternatives considered:**

- **Option B — Three separate PRs.** Rejected. Each is ~5 lines, the
  review overhead would dominate, and they're all the same "Replit fork
  hardening" theme. One PR keeps the changelog tight.

- **Option C — Introduce `BETTER_AUTH_TRUSTED_ORIGINS` env.** Rejected
  (per question 1). The MLabs default is boring deps and boring env. We
  can add the env later if a fork actually hits a custom-domain
  `trustedOrigins` wall that `BETTER_AUTH_URL` doesn't already cover.

- **Option D — Recursive `**.replit.dev` wildcard.** Rejected (per
  question 3). Next.js's `allowedDevOrigins` matcher semantics for
  multi-level globs are version-sensitive; the dynamic
  `REPLIT_DEV_DOMAIN` push already gives forks an escape hatch for
  unknown clusters.

- **Option E — Make `apps/web/src/lib/auth/index.ts` call a helper from
  `packages/auth/src/origins.ts`.** Rejected for now. Keeping
  `buildTrustedOrigins` co-located in the composition root means
  `packages/auth` stays env-shape-agnostic (its job is just to take a
  `string[]` and pass it to Better Auth). The helper is small enough
  that promoting it to `packages/auth` later is trivial if a second
  composition root ever appears.

## Data model changes

None.

## Files to touch

**New:**
- `apps/web/tests/auth-trusted-origins.test.ts` — unit test for
  `buildTrustedOrigins(env)` covering: Replit-only env, BETTER_AUTH_URL-only
  env, both set, neither set (still returns localhost defaults).

**Edit:**
- `apps/web/src/app/globals.css` — add `@source "../../../../packages/*/src/**/*.{ts,tsx}";`
- `packages/auth/src/server.ts` — add `trustedOrigins?: string[]` to
  `CreateAuthOptions`; pass through into `betterAuth({...})`.
- `apps/web/src/lib/auth/index.ts` — define `buildTrustedOrigins()` helper,
  call it, pass result to `createAuth({ trustedOrigins })`.
- `apps/web/next.config.mjs` — add `*.kirk.replit.dev` and dynamic
  `REPLIT_DEV_DOMAIN` entry.
- `docs/template/TEMPLATE.md` (or the lessons file it refs) — append a
  short "Replit fork hardening" note referencing this plan slug.

## Edge cases

- **`buildTrustedOrigins` dedupes.** If a fork sets `BETTER_AUTH_URL=https://localhost:5000`
  (silly but legal), the `Set` collapses the duplicate.
- **`REPLIT_DEV_DOMAIN` already includes scheme.** Currently Replit injects
  the bare host (no `https://`). The helper prepends `https://` once. If
  Replit ever flips that, the prefix gets doubled — guard with a starts-with
  check (`/^https?:\/\//`).
- **Better Auth `trustedOrigins` is permissive when omitted in some versions.**
  Version 1.6.10 is what's pinned in `packages/auth/package.json:20`; double-check
  the typing accepts `undefined` so `trustedOrigins: undefined` from the
  composition root is a no-op (current behavior).
- **Tailwind `@source` glob and node_modules.** Tailwind v4 still excludes
  `node_modules` from `@source` matches by design, so the
  `packages/*/src/**/*` glob — which goes through `../../../../`
  (file-system relative, not through `node_modules`) — is the only way to
  pick these up. Verify the relative path resolves: `apps/web/src/app/globals.css`
  → `../../../../packages/` lands at the repo root's `packages/`.
- **Test isolation.** The new test exercises a pure helper, no Better Auth
  boot, no DB, no env mocking framework needed — just call
  `buildTrustedOrigins({...})` with fixture inputs.
- **`*.kirk.replit.dev` future-proofing.** Replit has rolled out at least
  `worf.` and `kirk.` cluster prefixes; adding another in the future is
  one line. The dynamic `REPLIT_DEV_DOMAIN` push covers the gap.

## Acceptance criteria

- [ ] `pnpm --filter @mlabs/web build` succeeds; emitted CSS contains
      Tailwind classes used in `packages/ui-web/src/components/*.tsx`
      that are NOT also used in `apps/web/src/**` (proves the workspace
      package scan is live).
- [ ] `packages/auth/src/server.ts` `CreateAuthOptions` exposes
      `trustedOrigins?: string[]`; `betterAuth({ trustedOrigins })` is
      passed through.
- [ ] `apps/web/src/lib/auth/index.ts` calls `createAuth({ trustedOrigins })`
      with a list including localhost:3000, localhost:5000, and the
      `REPLIT_DEV_DOMAIN`-derived `https://...` when set.
- [ ] `apps/web/next.config.mjs` `allowedDevOrigins` includes
      `*.kirk.replit.dev` and conditionally `process.env.REPLIT_DEV_DOMAIN`.
- [ ] New vitest file `apps/web/tests/auth-trusted-origins.test.ts` has
      ≥4 assertions covering: Replit-only, BETTER_AUTH_URL-only, both,
      neither.
- [ ] `pnpm typecheck` clean across the workspace.
- [ ] `pnpm lint` clean across the workspace.
- [ ] `pnpm test` passes including the new test.
- [ ] No behavior change for an existing prod deploy that has
      `BETTER_AUTH_URL` set and is not on Replit (manual reasoning;
      `trustedOrigins` will simply include their `BETTER_AUTH_URL`).
- [ ] Short doc note added so future forks know why these entries exist.

## Open questions

For the reviewer (`/mlabs-review`) to resolve before implementation.

- **Q1.** Should `buildTrustedOrigins` live in `apps/web/src/lib/auth/`
  alongside the composition root, or get promoted to a sibling helper
  file (e.g. `apps/web/src/lib/auth/origins.ts`) for clarity? Default
  in this plan: co-locate in `index.ts` until a second caller appears.
- **Q2.** Does the doc note belong in `docs/template/TEMPLATE.md` or
  in a dedicated `docs/template/lessons.md`? Both are referenced in
  the `apps/web/next.config.mjs` comments — reviewer to pick the
  canonical home.
- **Q3.** Should the test use `vi.stubEnv` against the real `env` module,
  or just call the pure helper with synthetic inputs? Default: pure
  helper with synthetic inputs (no env mocking, no boot-time side effects).
- **Q4.** Tailwind `@source` path uses `../../../../packages` — four
  levels up from `apps/web/src/app/globals.css`. Confirm that resolves
  to the monorepo-root `packages/` and not somewhere unexpected on
  Replit's filesystem (it should — Replit just mounts the repo at a
  fixed prefix).
