<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:mstack -->
# mstack — the MLabs skill suite

This repo ships with **mstack**, a vendored Claude Code skill suite tailored to the MLabs MVP workflow. Skills live at `.claude/skills/mlabs-*` and produce artifacts under `.mstack/`. Both directories are intentionally tracked in git so reviews, plans, and learnings travel with the repo across cloud workspaces and forks. **Do not gitignore `.claude/` or `.mstack/`.**

## The workflow

```
/mlabs-plan ──→ .mstack/plans/<slug>.md
       │
       ▼
/mlabs-review ──→ .mstack/reviews/<slug>.md  (approved + implementation plan)
       │
       ▼
/mlabs-code ──→ .mstack/implementations/<slug>/  (code + commits + report)
       │
       ▼
/mlabs-qa ──→ .mstack/qa/<run>/  (scenario-driven test report)
```

`/mlabs-mockup` and `/mlabs-design-review` run in parallel when UI is involved. `/mlabs-auto` chains plan → review → code with two confirmation gates.

## When to use which skill

| Skill | Use when | Edits code? |
|---|---|---|
| `/mlabs-plan` | Designing a new feature; producing a plan doc | No |
| `/mlabs-review` | Reviewing a plan + producing the task list `/mlabs-code` will execute | No |
| `/mlabs-code` | Executing an approved review autonomously | **Yes (primary)** |
| `/mlabs-qa` | Scenario-driven QA testing → report → approve → fix | Only post-approval |
| `/mlabs-mockup` | Generating UI design variants for exploration | No (HTML in `.mstack/mockups/`) |
| `/mlabs-design-review` | Visual UX audit of live screens → report → approve → fix | Only post-approval |
| `/mlabs-auto` | Chaining plan → review → code in one pass | Delegates |

## Hard rules

- **`/mlabs-code` is the only skill that edits code as its primary purpose.** `/mlabs-qa` and `/mlabs-design-review` edit code only after an explicit user approval gate on a written report.
- **Plan → review → code is a strict pipeline.** `/mlabs-review` requires a plan doc; `/mlabs-code` requires an `approved` review.
- **One commit per task** in `/mlabs-code`. Never `--no-verify`. Never amend across tasks.
- **Pause on ambiguity.** Destructive migrations, edits to `src/config/brand.ts` / `src/config/design.ts` (rebrand layer), new top-level deps, CI config changes, env var rename/remove → always pause and ask.
- **Append surprises to `.mstack/learnings.jsonl`** via `.claude/skills/mlabs-shared/bin/append-learning.sh` so they compound across MVPs.

See each skill's `SKILL.md` for the full contract.
<!-- END:mstack -->
