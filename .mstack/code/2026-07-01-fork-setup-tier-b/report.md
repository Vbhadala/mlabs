# Implementation report: Tier B — fork-setup bundle

**Status:** complete
**Review:** [2026-07-01-fork-setup-tier-b](../../reviews/2026-07-01-fork-setup-tier-b.md)
**Branch:** Vbhadala/replace-admin-email-with-script
**Finished:** 2026-07-02

All 3 tasks implemented, one atomic commit each. Final gate: `pnpm typecheck`,
`pnpm lint`, `pnpm test` (5/5 packages) all green.

## Tasks

| # | Task | Status | Commit |
|---|------|--------|--------|
| 1 | `pnpm setup-deeplinks` script + unit tests (9) | ✓ done | `c5320d6` |
| 2 | `docs/fork-setup.md` canonical services & secrets map | ✓ done | `84ed9a6` |
| 3 | Cross-link README + FORK_CHECKLIST (replace manual steps) | ✓ done | `b3757fd` |

## Notable during the run

- **Bug caught by testing against real file contents (not just fixtures):**
  `app.config.ts` has a doc comment that also contains `` `com.example.mlabs` ``,
  which substitution intentionally leaves. The idempotency detector had to become
  **value-targeted** (`bundleIdentifier:`/`package:` positions + host), not a
  blanket string check — otherwise the "already configured" early-return never
  fired. Fixed + unit-tested.
- **Doc accuracy correction:** the FORK_CHECKLIST claimed forks must set GitHub
  repo secrets (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `POSTMARK_API_KEY`), but the
  shipped CI (`ci.yml`) uses **no** secrets — those names only appear in a
  bundle-scan *grep pattern*. `docs/fork-setup.md` states this correctly and TB3
  fixed the checklist line.

## Not runtime-verified (→ manual / `/mstack-qa`)

- `pnpm setup-deeplinks`' **interactive** prompt→write happy path. Verified: the
  pure substitutions against **real** file contents, the idempotency early-return,
  the non-TTY guard, and 9 unit tests — but the live readline prompt flow (TTY)
  wasn't driven. Suggested check: run `pnpm setup-deeplinks` interactively, enter
  values, then `pnpm verify:deeplinks` structural-checks the rewritten files.

## Recommended next step

Push onto PR #11 (this branch) or open a Tier-B PR — user's call. Optionally a
manual interactive run of `pnpm setup-deeplinks`.
