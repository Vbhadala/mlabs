# Run log — first-run-dx

- T2: test placed in apps/web/tests/ (not packages/config/src/) — @mlabs/config has no vitest runner; module is pure so location is immaterial. Zero new deps.
- T3: root scripts/ are CJS (no "type":module) → top-level await fails esbuild; T4/T5 must use async main(). getMigrationStatus uses neon HTTP driver (single read) — fails gracefully on unreachable DB (ws Pool emits uncatchable stream errors + needs multi-statement anyway).
- T6: ESLint no-restricted-syntax blocks ALL process.env (incl framework NEXT_* flags). Reviewer call to read them raw was wrong; dropped the guards — env.NODE_ENV==="development" alone correctly skips prod/build/test.
