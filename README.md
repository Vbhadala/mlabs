# MLabs Template

The Million Labs MVP template. Fork this repo for every new project.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · shadcn/ui · Drizzle · Neon · Better Auth · Postmark · Replit Object Storage.

**See [`PLAN.md`](./PLAN.md) for the full v1 plan, architecture decisions, and deferred TODOs.**

---

## Quick start

```bash
# 1. Install
npm install

# 2. Copy env and fill in the blanks
cp .env.example .env.local
$EDITOR .env.local

# 3. Run dev (uses SKIP_ENV_VALIDATION until W2+ deps are wired)
npm run dev
```

Dev server: <http://localhost:3000>

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Local dev with hot reload |
| `npm run build` | Production build (`next build`) |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` (the real quality gate) |
| `npm run db:generate` | Generate SQL migrations from schema changes |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:studio` | Drizzle Studio (DB browser) |

## Repo layout

```
src/
├── app/              # Next.js App Router routes
│   ├── (marketing)/  # Public landing
│   ├── (auth)/       # Login, signup, password reset
│   ├── (app)/        # Authed area
│   └── (admin)/      # Admin shell
├── features/         # Removable feature modules — delete the folder + nav line
├── lib/              # Core, non-removable
│   ├── auth/         # Better Auth (W2)
│   ├── db/           # Drizzle + audit_log helper (W2)
│   ├── email/        # Postmark wrappers (W3)
│   ├── storage/      # Replit Object Storage adapter (W4)
│   ├── ui/           # shadcn primitives + EmptyState/LoadingState/ErrorState/DataList (W4)
│   └── logger/       # console wrapper + error_log table (W4)
└── config/           # Centralized — rebrand happens here
    ├── brand.ts      # Name, tagline, support email, etc.
    ├── seo.ts        # Next.js metadata defaults
    ├── design.ts     # Semantic tokens + scales
    └── env.ts        # Boot-time env validation
```

## Rebrand in 10 minutes

1. Edit `src/config/brand.ts` — name, tagline, emails, legal entity, URL
2. Edit `src/config/design.ts` colors (HSL triplets — light + dark) AND mirror them in `src/app/globals.css`
3. Swap `public/favicon.ico`
4. Swap `public/og-default.png` (or rely on the `@vercel/og` route shipped in v1)

That's the whole rebrand.

## Adding / removing features

- **Add:** scaffold under `src/features/<name>/`. Use `<DataList>` and the state primitives. Add the nav link in `src/app/(app)/layout.tsx`.
- **Remove:** delete the feature folder, remove the nav link, run `npm run db:generate` to drop the feature's tables.

For removing template-shipped features, the `remove-feature` Claude skill (in `.claude/skills/`) handles env vars, migrations, and dep cleanup safely.

## Status

W1 (stack scaffold + config) is in progress. See [`PLAN.md` §11](./PLAN.md) for the full implementation roadmap.

| Workstream | Status |
|---|---|
| W1 — Scaffold + config | in progress |
| W2 — `lib/auth` (Better Auth + Drizzle) | not started |
| W3 — `lib/email` (Postmark) | not started |
| W4 — `lib/storage` + `lib/ui` + `lib/logger` | not started |
| W5 — `features/profile` + `features/avatar` | not started |
| W6 — `features/notifications` | not started |
| W7 — `features/messages` | not started |
| W8 — `features/admin` + `audit_log` | not started |
| W9 — `.claude/skills/*` | not started |
