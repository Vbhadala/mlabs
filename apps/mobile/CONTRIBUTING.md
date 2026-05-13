# Contributing — mobile/

Expo (SDK 51+) sibling app to the Next.js web app at `../src`. NativeWind v4
+ Tailwind v3 mobile config (generated from `src/config/design.ts`).

## Local dev

```bash
cd mobile
npm install
npx expo start
```

Press `i` to open iOS simulator (Mac only), `a` for Android emulator. Hot
reload on save.

## Token regeneration

Tailwind config is generated from `src/config/design.ts`. Never hand-edit
`mobile/tailwind.config.js` — pre-commit will reject it.

```bash
npm run gen:mobile-tw         # regenerate (run after design.ts changes)
npm run gen:mobile-tw:check   # CI-style check: exits 1 if drifted
```

## E2E tests (Maestro, local-only)

Phase 5.5 ships 11 flows in `.maestro/`. They run locally only; CI promotion
is tracked in `TODOS.md` #2.

```bash
brew install maestro             # one-time
maestro test .maestro/           # runs all 11 flows in order
maestro test .maestro/05-avatar-upload.yaml   # single flow
```

Flows reference a few template variables (`${MAESTRO_APP_ID}`, `${RUN_ID}`,
`${VERIFY_TOKEN}`, `${RESET_TOKEN}`, `${PEER_NAME}`); set them in your shell
or via `maestro --env`.

## Type check

```bash
npm run typecheck            # mobile-only tsc --noEmit
```

## Native builds

```bash
npx expo prebuild --no-install   # generates ios/ + android/ project folders
eas build --profile dev          # development client (internal distribution)
eas build --profile preview      # internal preview (.apk / .ipa)
```

Production build profiles are deliberately omitted in v1 (per Architecture
decision #6); add them per-fork when ready to submit. The HANDOVER.md
template carries the full submission checklist.

## Adding a primitive

Mobile components live in `mobile/components/ui/`. Match the shadcn API
surface (variants, sizes) so web ↔ mobile feature parity is mechanical.
