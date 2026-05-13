import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Allow Playwright (and any 127.0.0.1 access) to hit dev resources without warnings.
  // Next.js 16 blocks cross-origin dev requests by default.
  allowedDevOrigins: ["127.0.0.1"],

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
