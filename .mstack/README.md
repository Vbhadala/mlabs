# .mstack/

Workspace storage for the **mstack** Claude Code skill suite (`mlabs-plan`,
`mlabs-review`, `mlabs-code`, `mlabs-qa`, `mlabs-mockup`, `mlabs-design-review`,
`mlabs-auto`).

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
├── implementations/             # /mlabs-code output
│   └── YYYY-MM-DD-<slug>/
│       ├── tasks.md
│       └── report.md
├── qa/                          # /mlabs-qa output
│   └── YYYY-MM-DD/
│       ├── report.md
│       └── assets/
├── mockups/                     # /mlabs-mockup output
│   └── <feature>/
│       ├── v1/ … vN/
│       └── FEEDBACK.md
└── design-reviews/              # /mlabs-design-review output
    └── YYYY-MM-DD-<slug>.md
```

## Workflow

```
/mlabs-plan ──→ plan.md
       │
       ▼
/mlabs-review ──→ approved + implementation plan
       │
       ▼
/mlabs-code ──→ code + task log + report
       │
       ▼
/mlabs-qa ──→ test report (ask what to focus on)
```

`/mlabs-mockup` and `/mlabs-design-review` run in parallel when UI is involved.
`/mlabs-auto` chains plan → review → code in one shot.

## Learnings

`learnings.jsonl` is the cross-skill memory. Skills append surprises here:
constraints discovered, gotchas hit, decisions worth remembering. Review
periodically and promote generic ones up to the mlabs-template repo.
