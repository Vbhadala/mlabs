# .mstack/

Workspace storage for the **mstack** Claude Code plugin (`vbhadala/mstack`):
`/mstack-plan`, `/mstack-review`, `/mstack-code`,
`/mstack-qa`, `/mstack-mockup`, `/mstack-ux-audit`,
`/mstack-debug`, `/mstack-research`, `/mstack-auto`.

Everything in here is **committed to git** so reviews, plans, and learnings
show up in PRs and travel with the repo across cloud workspaces.

## Layout

```
.mstack/
├── learnings.jsonl              # append-only, all skills write here
├── plans/                       # /mstack-plan output
│   └── YYYY-MM-DD-<slug>.md
├── reviews/                     # /mstack-review output
│   └── YYYY-MM-DD-<slug>.md
├── code/                        # /mstack-code output
│   └── YYYY-MM-DD-<slug>/
│       ├── tasks.md
│       └── report.md
├── qa/                          # /mstack-qa output
│   └── YYYY-MM-DD-HHMM/
│       ├── report.md
│       └── assets/
├── debug/                       # /mstack-debug output (RCA → hand to /mstack-code)
│   └── YYYY-MM-DD-<slug>/
│       ├── report.md
│       ├── assets/
│       └── specs/
├── research/                    # /mstack-research output (→ feeds /mstack-plan)
│   └── YYYY-MM-DD-<slug>.md
├── mockups/                     # /mstack-mockup output
│   └── <feature>/
│       ├── v1/ … vN/
│       └── FEEDBACK.md
└── ux-audits/                   # /mstack-ux-audit output
    └── YYYY-MM-DD-<slug>.md
```

## Workflow

```
/mstack-research ─→ plans/ ─→ reviews/ ─→ [mockups/] ─→ code/ ─→ qa/   (greenfield)
                                          ↑
                                          only when review's
                                          UI-Significant: yes

                   /mstack-debug ──────────────────→ code/             (bug fix, RCA-first)
                   /mstack-qa  ──(escalate paused)─→ /mstack-debug   (discovery → RCA)
                   /mstack-ux-audit ──────────(post-ship visual + UX polish)
```

`/mstack-auto` chains the main path including the optional mockup gate.
`/mstack-research`, `/mstack-debug`, and `/mstack-ux-audit`
are user-triggered by design — auto never spawns them.

## Golden rule

**Only `/mstack-code` edits source code.** Every other skill writes artifacts to
`.mstack/` and hands off via the chain above.

## Learnings

`learnings.jsonl` is the cross-skill memory. Skills append surprises here:
constraints discovered, gotchas hit, decisions worth remembering. Review
periodically and promote generic ones up to the mlabs-template repo.
