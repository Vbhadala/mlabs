import { describe, it, expect } from "vitest"
import {
  evaluateConfig,
  hasMissingCritical,
  missingBySeverity,
  CONFIG_CHECKS,
} from "@mlabs/config/env-doctor"

// Lives here (not packages/config/src/) because @mlabs/config has no test
// runner; apps/web already runs vitest. The module under test is pure, so
// location is immaterial.

describe("evaluateConfig", () => {
  it("flags every check as missing on an empty config", () => {
    const results = evaluateConfig({})
    expect(results).toHaveLength(CONFIG_CHECKS.length)
    expect(results.every((r) => r.status === "missing")).toBe(true)
    expect(hasMissingCritical(results)).toBe(true)
  })

  it("reports exactly the two critical vars when empty", () => {
    const critical = missingBySeverity(evaluateConfig({}), "critical")
      .map((r) => r.key)
      .sort()
    expect(critical).toEqual(["BETTER_AUTH_SECRET", "DATABASE_URL"])
  })

  it("marks present vars ok and clears the critical flag", () => {
    const results = evaluateConfig({
      DATABASE_URL: "postgres://user:pass@host/db",
      BETTER_AUTH_SECRET: "x".repeat(40),
    })
    const status = Object.fromEntries(results.map((r) => [r.key, r.status]))
    expect(status.DATABASE_URL).toBe("ok")
    expect(status.BETTER_AUTH_SECRET).toBe("ok")
    expect(hasMissingCritical(results)).toBe(false)
  })

  it("treats whitespace-only and undefined as missing", () => {
    const results = evaluateConfig({ DATABASE_URL: "   ", BETTER_AUTH_SECRET: undefined })
    const status = Object.fromEntries(results.map((r) => [r.key, r.status]))
    expect(status.DATABASE_URL).toBe("missing")
    expect(status.BETTER_AUTH_SECRET).toBe("missing")
  })

  it("does not mutate the shared CONFIG_CHECKS", () => {
    evaluateConfig({ DATABASE_URL: "postgres://x" })
    expect(CONFIG_CHECKS.find((c) => c.key === "DATABASE_URL")).not.toHaveProperty("status")
  })
})
