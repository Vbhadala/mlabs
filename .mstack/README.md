# .mstack/

Workspace storage for the **mstack** Claude Code plugin (`vbhadala/mstack`):
`/mstack:mstack-plan`, `/mstack:mstack-review`, `/mstack:mstack-code`,
`/mstack:mstack-qa`, `/mstack:mstack-mockup`, `/mstack:mstack-ux-audit`,
`/mstack:mstack-debug`, `/mstack:mstack-research`, `/mstack:mstack-auto`.

Everything in here is **committed to git** so reviews, plans, and learnings
show up in PRs and travel with the repo across cloud workspaces.

## Layout

```
.mstack/
├── learnings.jsonl              # append-only, all skills write here
├── plans/                       # /mstack:mstack-plan output
│   └── YYYY-MM-DD-<slug>.md
├── reviews/                     # /mstack:mstack-review output
│   └── YYYY-MM-DD-<slug>.md
├── code/                        # /mstack:mstack-code output
│   └── YYYY-MM-DD-<slug>/
│       ├── tasks.md
│       └── report.md
├── qa/                          # /mstack:mstack-qa output
│   └── YYYY-MM-DD-HHMM/
│       ├── report.md
│       └── assets/
├── debug/                       # /mstack:mstack-debug output (RCA → hand to /mstack:mstack-code)
│   └── YYYY-MM-DD-<slug>/
│       ├── report.md
│       ├── assets/
│       └── specs/
├── research/                    # /mstack:mstack-research output (→ feeds /mstack:mstack-plan)
│   └── YYYY-MM-DD-<slug>.md
├── mockups/                     # /mstack:mstack-mockup output
│   └── <feature>/
│       ├── v1/ … vN/
│       └── FEEDBACK.md
└── ux-audits/                   # /mstack:mstack-ux-audit output
    └── YYYY-MM-DD-<slug>.md
```

## Workflow

```
/mstack:mstack-research ─→ plans/ ─→ reviews/ ─→ [mockups/] ─→ code/ ─→ qa/   (greenfield)
                                          ↑
                                          only when review's
                                          UI-Significant: yes

                   /mstack:mstack-debug ──────────────────→ code/             (bug fix, RCA-first)
                   /mstack:mstack-qa  ──(escalate paused)─→ /mstack:mstack-debug   (discovery → RCA)
                   /mstack:mstack-ux-audit ──────────(post-ship visual + UX polish)
```

`/mstack:mstack-auto` chains the main path including the optional mockup gate.
`/mstack:mstack-research`, `/mstack:mstack-debug`, and `/mstack:mstack-ux-audit`
are user-triggered by design — auto never spawns them.

## Golden rule

**Only `/mstack:mstack-code` edits source code.** Every other skill writes artifacts to
`.mstack/` and hands off via the chain above.

## Learnings

`learnings.jsonl` is the cross-skill memory. Skills append surprises here:
constraints discovered, gotchas hit, decisions worth remembering. Review
periodically and promote generic ones up to the mlabs-template repo.
