# .mstack/

Workspace storage for the **mstack** Claude Code skill suite (`mlabs-plan`,
`mlabs-review`, `mlabs-code`, `mlabs-qa`, `mlabs-mockup`, `mlabs-ux-audit`,
`mlabs-debug`, `mlabs-research`, `mlabs-auto`).

Everything in here is **committed to git** so reviews, plans, and learnings
show up in PRs and travel with the repo across cloud workspaces.

## Layout

```
.mstack/
├── learnings.jsonl              # append-only, all skills write here
├── plans/                       # /mlabs-plan output
│   └── YYYY-MM-DD-<slug>.md
├── reviews/                     # /mlabs-review output
│   └── YYYY-MM-DD-<slug>.md
├── code/                        # /mlabs-code output
│   └── YYYY-MM-DD-<slug>/
│       ├── tasks.md
│       └── report.md
├── qa/                          # /mlabs-qa output
│   └── YYYY-MM-DD-HHMM/
│       ├── report.md
│       └── assets/
├── debug/                       # /mlabs-debug output (RCA → hand to /mlabs-code)
│   └── YYYY-MM-DD-<slug>/
│       ├── report.md
│       ├── assets/
│       └── specs/
├── research/                    # /mlabs-research output (→ feeds /mlabs-plan)
│   └── YYYY-MM-DD-<slug>.md
├── mockups/                     # /mlabs-mockup output
│   └── <feature>/
│       ├── v1/ … vN/
│       └── FEEDBACK.md
└── ux-audits/                   # /mlabs-ux-audit output
    └── YYYY-MM-DD-<slug>.md
```

## Workflow

```
/mlabs-research ─→ plans/ ─→ reviews/ ─→ code/        (greenfield)
                   /mlabs-debug ────────→ code/       (bug fix, RCA-first)
                   /mlabs-qa  ─(escalate)→ /mlabs-debug (discovery → RCA)
```

`/mlabs-mockup` and `/mlabs-ux-audit` run in parallel when UI is involved.
`/mlabs-auto` chains plan → review → code in one shot (does not include
`/mlabs-research` or `/mlabs-debug` — those are user-triggered by design).

## Golden rule

**Only `/mlabs-code` edits source code.** Every other skill writes artifacts to
`.mstack/` and hands off via the chain above.

## Learnings

`learnings.jsonl` is the cross-skill memory. Skills append surprises here:
constraints discovered, gotchas hit, decisions worth remembering. Review
periodically and promote generic ones up to the mlabs-template repo.
