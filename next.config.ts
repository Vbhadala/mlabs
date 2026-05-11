import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Allow Playwright (and any 127.0.0.1 access) to hit dev resources without warnings.
  // Next.js 16 blocks cross-origin dev requests by default.
  allowedDevOrigins: ["127.0.0.1"],
}

export default nextConfig
