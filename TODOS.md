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
