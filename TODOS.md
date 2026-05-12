# TODOs (captured from reviews)

Items deferred from active phases. Each has a clear trigger condition for when to revisit. Add new TODOs at the bottom with date + source review.

---

## 1. Load-test ETag effectiveness on /api/notifications/unread-count and /api/messages/conversations
**Captured:** 2026-05-11, /plan-eng-review (Phase 5.5)
**Why:** Outside voice argued conditional GET may be over-engineering. We kept it based on assumed load math (1k users × 5s × 2 platforms = 34M req/day). The math was not measured.
**Pros:** Validates the architecture before more code piles on top. Could reveal we're solving a non-problem.
**Cons:** Needs a load-test harness (Artillery or k6).
**Trigger:** First fork reaches 500 DAU, OR v1.1 cycle starts — whichever comes first.
**Approach:** Spike 1k simulated users × 5s polling × 10 min with conditional GET enabled vs disabled. Measure Neon connection count, p99 latency, server CPU. If 304 short-circuit saves <30% of CPU, drop conditional GET + triggers in v1.2.
**See:** docs/decisions/0005-conditional-get-load-math.md

---

## 2. Mobile E2E (Maestro) in CI
**Captured:** 2026-05-11, /plan-eng-review (Phase 5.5)
**Why:** Test #2 chose local-only Maestro runs. Local-only test suites rot — devs skip them before PRs, regressions ship.
**Pros:** Catches mobile regressions automatically; restores confidence in the 11 Maestro flows.
**Cons:** ~$0.08/min macOS runner cost on GH Actions, ~5-8 min added per PR.
**Trigger:** First time a mobile regression slips to a fork because local Maestro was skipped, OR a fork explicitly requests CI mobile coverage.
**Approach:** Add `.github/workflows/mobile-e2e.yml` with macOS-13 runner for iOS Simulator + ubuntu-latest with KVM for Android Emulator. Gate on PRs that touch `mobile/**` or `src/lib/schemas/**`.

---

## 3. In-app dark mode toggle on mobile
**Captured:** 2026-05-12, /plan-design-review (Phase 5.5)
**Why:** Design Pass 5 #1 locked system-follow only (`useColorScheme()`); web has a profile-level toggle. Forks may want parity.
**Pros:** User agency over system setting; matches web pattern.
**Cons:** ~2 hrs (toggle UI + secure-store persistence + Theme provider override).
**Trigger:** First fork explicitly requests in-app toggle, OR v1.1 cycle.
**Approach:** Add `mobile/lib/theme/useTheme.tsx` with secure-store-backed override (`light` | `dark` | `system`); expose toggle in Profile > Appearance section.

---

## 4. iPad-specific layout (master-detail)
**Captured:** 2026-05-12, /plan-design-review (Phase 5.5)
**Why:** Design Pass 6 skipped iPad-specific layout in v1 to ship a baseline phone experience. iPad currently renders the phone layout scaled up — workable but not native-feeling.
**Pros:** Real Apple submission target; "designed for iPad" affordance.
**Cons:** ~1 day (split-view messages, side bar replacing tab bar on landscape, font scaling per breakpoint).
**Trigger:** First fork that ships an iPad-targeted app, OR an explicit Apple iPad submission requirement.
**Approach:** Expo Router per-platform routing; `mobile/app/(app)/_layout.tsx` switches to a side-bar layout when `Dimensions.get('window').width >= 768`.

---

## 5. Custom empty-state SVG illustrations
**Captured:** 2026-05-12, /plan-design-review (Phase 5.5)
**Why:** Design Pass 4 #3 locked the 3-SVG pattern (inbox, notifications, no-results) but didn't lock who draws them. Default to Lucide icons-as-illustrations is the AI slop fallback we explicitly chose to avoid.
**Pros:** Removes generic-template vibe at the moments forks see most (empty states).
**Cons:** ~3 hrs (Figma sketch + vector export + currentColor cleanup) OR AI image gen + vector trace.
**Trigger:** **Before Phase 5.5 ships.** Block-on-implementation — empty states ship visible.
**Approach:** Sketch in Figma, export as inlinable `.svg` files at `mobile/assets/illustrations/`. Use `currentColor` for stroke/fill so brand color applies. ~80×80pt nominal size.

---

## 6. Back-fill mobile sections into DESIGN.md.template
**Captured:** 2026-05-12, /plan-design-review (Phase 5.5)
**Why:** DESIGN.md.template is scheduled for Phase 7. This review locked many mobile-specific design decisions (nav pattern, state matrix, a11y, splash, avatar fallback, toast position) that should live in the canonical doc.
**Pros:** Single source of truth for design system across web + mobile; forks running /design-consultation can override coherently.
**Cons:** Cross-phase coupling — Phase 7 work depends on reading PHASE_5_5.md.
**Trigger:** When Phase 7 starts work on `DESIGN.md.template`.
**Approach:** Phase 7 author reads PHASE_5_5.md "Design specification" section; carries mobile sub-sections into DESIGN.md.template (navigation, mobile-specific tokens, accessibility specs, mobile primitive variants).

---

## 31. Manual mobile cold-boot before PR merge — **pre-merge gate**
**Captured:** 2026-05-13, Phase 9 review (other session)
**Why:** CI's bundle-scan job only proves the mobile JS bundle compiles and has the right shape. It doesn't verify the app actually mounts, the auth flow works, or that tab navigation renders. That's on a human in front of a simulator.
**Pros:** Catches runtime crashes the static-analysis CI can't.
**Cons:** Can't be automated in CI without a macOS runner + headed simulator (deferred per TODO #2).
**Trigger:** **Before the monorepo migration PR is approved for merge.** Block on this.
**Approach:** Run `pnpm --filter @mlabs/mobile exec expo start`, cold-boot in iOS simulator (or a device via Expo Go), walk: sign-in → tab nav → profile → messages → notifications. Anything renders blank or throws → fix before merge.

---

## 32. Drop legacy duplicate server modules in apps/web
**Captured:** 2026-05-13, Phase 9 review (other session)
**Why:** `apps/web/src/features/messages/server/*` and `apps/web/src/features/notifications/server/{create,queries,actions}.ts` still duplicate logic that now lives in `@mlabs/services`. They survive only because `apps/web/tests/{messages-server,notifications}.test.ts` target them directly with `vi.mock` setups.
**Pros:** Removes the "which is canonical?" ambiguity. Shrinks apps/web surface area. Forces service-level tests, which are simpler than route-level mock chains.
**Cons:** ~20-30 `vi.mock` entries to rewire. Risk of test-coverage gap if the route-level paths exercised something the service tests miss.
**Trigger:** Bundled cleanup PR after the monorepo migration lands, OR a follow-up commit on `chore/monorepo-migration` before merge.
**Approach:** Mirror what Phase 8 Part A did for admin actions — migrate the two test files to `packages/services/src/{messages,notifications}/__tests__/service.test.ts`. Once tests pass at the service layer, delete the duplicated `apps/web/src/features/.../server/` files. Run the full pipeline (typecheck/lint/test/bundle-scan) before commit.

---

## 34. Set up jest-expo + first mobile spec
**Captured:** 2026-05-13, Phase 9 review (other session)
**Why:** `apps/mobile/package.json` `"test"` script is currently `echo '...' && exit 0`. `jest-expo@~55.0.17` is already in devDependencies (post-SDK-55 upgrade) but no `jest.config.js` exists. The test harness is ready; we just haven't lit the pilot light.
**Pros:** Enables unit tests on mobile primitives + service-consumer wrappers. CI test job picks it up automatically — no workflow change. First spec serves as a template for future ones.
**Cons:** Modest config work; first spec needs to actually be meaningful (not just `expect(true).toBe(true)`).
**Trigger:** First mobile-side bug worth a regression test, OR a quiet week to backfill.
**Approach:** Create `apps/mobile/jest.config.js` extending the `jest-expo` preset. Write one smoke spec (render `<Home />` from the (app) tab and assert no throw + a couple of expected labels). Flip `package.json` `"test"` from echo to `jest`.

---

## 36. Reconstruct missing `0005_snapshot.json` in packages/db migrations
**Captured:** 2026-05-13, Phase 9 review (other session)
**Why:** `packages/db/drizzle/migrations/meta/0005_snapshot.json` never landed (pre-existing from before the monorepo migration). Running `pnpm db:generate` for a new migration regenerates a duplicate `0006_*.sql` instead of advancing because drizzle-kit can't find the `0005` predecessor snapshot.
**Pros:** Unblocks future schema changes; without the fix, every new migration hits this loop.
**Cons:** Hand-reconstruction is fiddly (must match `0005_*.sql` + `0004_snapshot.json` exactly).
**Trigger:** Next time someone needs to add a schema change. Currently dormant.
**Approach:** Option A: reconstruct `0005_snapshot.json` by hand from the SQL + previous snapshot. Option B: `drizzle-kit drop --tag 0005` then regenerate the chain (lossy if anyone's databases are at 0005). Choose Option A unless no production data is at risk.

---

## 37. Document EAS `runtimeVersion` bump for production deploys
**Captured:** 2026-05-13, Phase 9 review (other session)
**Why:** `apps/mobile/eas.json` only has `dev` + `preview` channels. Production submit is a per-fork concern. When a fork ships to production, the SDK 51 → 55 native build change means existing OTA-channel users stop getting updates unless `runtimeVersion` is bumped and native binaries are rebuilt. Deployers will forget this if it's not written down.
**Pros:** Prevents a "why are my OTA updates not landing?" panic in production.
**Cons:** Doc-only — no code change, but the doc has to find the deployer.
**Trigger:** First fork that ships to production after SDK 55.
**Approach:** Add a section to `apps/mobile/README.md` (or a comment in `app.config.ts`) titled "When bumping Expo SDK in production." Explain runtimeVersion semantics, when to bump, and the rebuild-and-resubmit requirement.

---
