import { describe, it, expect } from "vitest"
import { buildTrustedOrigins } from "@/lib/auth/origins"

describe("buildTrustedOrigins", () => {
  it("always includes cross-port localhost defaults", () => {
    const origins = buildTrustedOrigins({})
    expect(origins).toContain("http://localhost:3000")
    expect(origins).toContain("http://localhost:5000")
  })

  it("appends the Replit dev domain when set", () => {
    const origins = buildTrustedOrigins({
      replitDevDomain: "my-app.kirk.replit.dev",
    })
    expect(origins).toContain("https://my-app.kirk.replit.dev")
  })

  it("omits the Replit entry when replitDevDomain is undefined", () => {
    const origins = buildTrustedOrigins({ replitDevDomain: undefined })
    expect(origins.some((o) => o.includes("replit.dev"))).toBe(false)
  })

  it("does NOT include BETTER_AUTH_URL — Better Auth auto-trusts baseURL.origin", () => {
    // Regression guard: helper input must remain replitDevDomain-only so we
    // don't duplicate / conflict with Better Auth's built-in baseURL trust.
    const origins = buildTrustedOrigins({
      replitDevDomain: "x.replit.dev",
    })
    expect(origins).toEqual([
      "http://localhost:3000",
      "http://localhost:5000",
      "https://x.replit.dev",
    ])
  })

  it("is pure — repeated calls return equivalent arrays", () => {
    const a = buildTrustedOrigins({ replitDevDomain: "x.replit.dev" })
    const b = buildTrustedOrigins({ replitDevDomain: "x.replit.dev" })
    expect(a).toEqual(b)
  })
})
