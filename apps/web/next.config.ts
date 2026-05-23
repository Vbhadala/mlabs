import path from "node:path"
import { fileURLToPath } from "node:url"
import type { NextConfig } from "next"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const nextConfig: NextConfig = {
  // Self-contained runtime in .next/standalone/ so the deploy image doesn't
  // need the full workspace node_modules at runtime. Without this, the
  // Replit Reserved VM image easily exceeds the 8 GiB cap (workspace
  // devDeps alone are ~2 GB once Playwright, vitest, drizzle-kit, etc. land).
  // See docs/template/TEMPLATE.md §11 + recommendations #22–#24.
  output: "standalone",

  // pnpm workspace: scope the file tracer at the monorepo root so it
  // follows pnpm symlinks into packages/*. Without this, Next traces only
  // apps/web/ and ships a runtime that 500s on first request that imports
  // @mlabs/db (or any other workspace dep) with `Cannot find module`.
  outputFileTracingRoot: path.join(__dirname, "../.."),

  // Allow dev-time cross-origin requests from local + Replit preview hosts.
  // Next.js 16 blocks cross-origin dev requests by default; without these
  // the *.replit.dev preview iframe shows CORS warnings on every HMR ping.
  allowedDevOrigins: [
    "127.0.0.1",
    "*.replit.dev",
    "*.repl.co",
    "*.worf.replit.dev",
  ],

  // Workspace packages ship TS source from packages/* — Next needs to run
  // them through its compiler instead of trying to load them as pre-built JS.
  transpilePackages: [
    "@mlabs/api",
    "@mlabs/auth",
    "@mlabs/config",
    "@mlabs/db",
    "@mlabs/email",
    "@mlabs/services",
    "@mlabs/ui-web",
    "@mlabs/validators",
  ],
}

export default nextConfig
