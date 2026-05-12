---
name: mlabs-auto
description: |
  Chains /mlabs-plan → /mlabs-review → /mlabs-code into one pipeline. Pauses
  at two gates (after plan, after review) for the user to confirm — fast path
  is "looks good, continue?" → "yes". Each underlying skill writes its normal
  artifacts to .mstack/, so a /mlabs-auto run is identical in output to running
  the three skills manually. Use when you want one-command flow from idea to
  shipped code.
  Use when the user says "auto", "plan and ship X", "do the whole flow",
  "/mlabs-auto", or describes a feature and wants to skip the manual handoffs.
allowed-tools:
  - Read
  - Glob
  - Grep
  - Edit
  - Write
  - Bash
  - AskUserQuestion
  - TaskCreate
  - TaskUpdate
  - TaskList
---

# mlabs-auto

Chain: `/mlabs-plan` → gate → `/mlabs-review` → gate → `/mlabs-code`.

This skill orchestrates — it does not duplicate logic. Each underlying skill
runs as if invoked directly, with its full behaviour and artifact output.

## Pre-flight

1. Verify git state up front (same checks as `/mlabs-code`):
   - Branch is not `main`/`master`
   - Working tree is clean
   Abort early if either fails — better than discovering it after a plan is
   written.

2. Use AskUserQuestion to collect the feature brief in one shot:
   - **Feature** — what is being built?
   - **Persona** — who is it for?
   - **Wedge** — what user pain does it solve?
   - **Out of scope** — explicit non-goals?
   - **Constraints** — deadline, must-not-break?

   This pre-loads everything `/mlabs-plan` would otherwise ask for, so the
   first phase runs without further interruption.

## Step 1 — Plan

Invoke the `/mlabs-plan` flow with the pre-collected brief. The plan doc
lands in `.mstack/plans/<slug>.md`.

**Gate A** — show the user the plan path and a one-paragraph summary. Ask:

- **Continue** — proceed to review
- **Edit and continue** — open the plan, ask what to change, edit, then proceed
- **Stop** — exit cleanly; the plan stays for manual `/mlabs-review` later

## Step 2 — Review

Invoke the `/mlabs-review` flow on the plan from Step 1 (skip the
"find latest plan" step — pass the path directly). Reviews are inherently
interactive (blockers/concerns/decisions surface mid-flow); let those run as
normal — don't try to suppress them.

**Gate B** — show the user the review path and a summary (N tasks, any
deferred concerns). Ask:

- **Continue** — proceed to code
- **Stop** — exit cleanly; the review stays for manual `/mlabs-code` later

## Step 3 — Code

Invoke the `/mlabs-code` flow on the review from Step 2 (pass the path
directly). Pauses inside `/mlabs-code` (acceptance failures, "Pause if"
triggers) surface to the user as normal.

## Final summary

When `/mlabs-code` completes, summarise the whole run:

```
mlabs-auto complete
  Plan:    .mstack/plans/<slug>.md
  Review:  .mstack/reviews/<slug>.md
  Code:    .mstack/implementations/<slug>/report.md
  Commits: N · Tasks done: N/M · Paused: N · Skipped: N
  Recommended next step: /mlabs-qa with focus on <area>
```

## Anti-patterns

- **Don't reimplement the underlying skills.** `/mlabs-auto` only adds the
  brief-collection up front and the two gates. All actual work goes through
  `/mlabs-plan`, `/mlabs-review`, `/mlabs-code` so improvements there flow
  here automatically.
- **Don't skip the gates** even when the user says "just go". The plan and
  review are cheap to glance at, and gate A in particular catches
  misunderstandings before any code is touched. If the user wants fully
  unattended, that's a future `/mlabs-yolo` — not this skill.
- **Don't include `/mlabs-qa` in the chain.** QA is scenario-driven; it needs
  user input on focus and is best run as a deliberate next step.
- **Don't run if the working tree is dirty** or the branch is `main`/`master`.
  Fail fast in pre-flight, not three skills deep.
