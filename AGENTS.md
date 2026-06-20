<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:mstack -->
# mstack — the MLabs skill suite

This repo works with **mstack**, a Claude Code skill suite tailored to the MLabs MVP workflow, published as a plugin (`vbhadala/mstack`). Skills produce artifacts under `.mstack/`, which is intentionally tracked in git so reviews, plans, and learnings travel with the repo across cloud workspaces and forks. **Do not gitignore `.mstack/`.**

## The workflow

Skills ship in the **mstack** plugin (`vbhadala/mstack`); invoke as `/mstack:<name>` or just describe the task.

```
mstack-research ──→ .mstack/research/<slug>.md      (optional, before mstack-plan)
       │
       ▼
mstack-plan ──────→ .mstack/plans/<slug>.md
       │
       ▼
mstack-review ────→ .mstack/reviews/<slug>.md       (approved + implementation plan
       │                                             + UI-Significant: yes|no flag)
       │
       │ if review's UI-Significant: yes
       ▼
mstack-mockup ────→ .mstack/mockups/<feature>/      (optional design exploration)
       │            (winner referenced in FEEDBACK.md)
       │
       ▼
mstack-code ──────→ .mstack/code/<slug>/            (code + commits + report)
       │
       ▼
mstack-qa ────────→ .mstack/qa/<run>/               (scenario-driven test report)
       │
       │ (escalate paused / un-RCA'd issues)
       ▼
mstack-debug ─────→ .mstack/debug/<slug>/  ──→ mstack-code  (bug fix, RCA-first)

mstack-ux-audit ──→ .mstack/ux-audits/<run>/        (post-ship visual + UX polish)
```

**Only `/mstack:mstack-code` edits source code.** Every other skill writes artifacts to `.mstack/` and hands off via the chain.

`/mstack:mstack-auto` chains plan → review → (mockup if UI-significant) → code with confirmation gates. `/mstack:mstack-research`, `/mstack:mstack-debug`, and `/mstack:mstack-ux-audit` are user-triggered by design.

## When to use which skill

| Skill | Use when | Edits code? |
|---|---|---|
| `/mstack:mstack-research` | Tech choice / stack research with sources + second opinion | No |
| `/mstack:mstack-plan` | Designing a new feature; producing a plan doc | No |
| `/mstack:mstack-review` | Reviewing a plan + producing the task list `/mstack:mstack-code` will execute | No |
| `/mstack:mstack-code` | Executing an approved review autonomously | **Yes (primary)** |
| `/mstack:mstack-debug` | A specific bug is reported → reproduce → RCA → fix proposal | No (hands to `/mstack:mstack-code`) |
| `/mstack:mstack-qa` | Scenario-driven QA testing → report → approve → fix | Only post-approval |
| `/mstack:mstack-mockup` | Generating UI design variants — standalone, or in-chain via `--from-review` when review is UI-significant | No (HTML in `.mstack/mockups/`) |
| `/mstack:mstack-ux-audit` | Post-ship UX audit (visual + copy + flow + a11y) → report → approve → fix | Only post-approval |
| `/mstack:mstack-auto` | Chaining plan → review → (optional mockup) → code in one pass | Delegates |

## Hard rules

- **`/mstack:mstack-code` is the only skill that edits code as its primary purpose.** `/mstack:mstack-qa` and `/mstack:mstack-ux-audit` edit code only after an explicit user approval gate on a written report.
- **Plan → review → code is a strict pipeline.** `/mstack:mstack-review` requires a plan doc; `/mstack:mstack-code` requires an `approved` review.
- **One commit per task** in `/mstack:mstack-code`. Never `--no-verify`. Never amend across tasks.
- **Pause on ambiguity.** Destructive migrations, edits to `src/config/brand.ts` / `src/config/design.ts` (rebrand layer), new top-level deps, CI config changes, env var rename/remove → always pause and ask.
- **Append surprises to `.mstack/learnings.jsonl`** via `${CLAUDE_PLUGIN_ROOT}/shared/bin/append-learning.sh` (provided by the mstack plugin; available when an mstack skill runs) so they compound across MVPs.

See each skill's `SKILL.md` for the full contract.
<!-- END:mstack -->
