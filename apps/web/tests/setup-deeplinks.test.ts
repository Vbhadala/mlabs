import { describe, expect, it } from "vitest"
import {
  isTeamId,
  isReverseDomain,
  isSha256Fingerprint,
  isHostname,
  substituteAasa,
  substituteAssetlinks,
  substituteAppConfig,
  aasaConfigured,
  assetlinksConfigured,
  appConfigConfigured,
} from "../../../scripts/setup-deeplinks"

const SHA = "AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89"

describe("validators", () => {
  it("accepts a valid Apple Team ID and rejects malformed", () => {
    expect(isTeamId("ABCDE12345")).toBe(true)
    expect(isTeamId("abcde12345")).toBe(false) // lowercase
    expect(isTeamId("ABCDE123")).toBe(false) // too short
  })

  it("accepts reverse-domain bundle/package", () => {
    expect(isReverseDomain("com.acme.app")).toBe(true)
    expect(isReverseDomain("com")).toBe(false) // single segment
    expect(isReverseDomain("com..app")).toBe(false)
  })

  it("accepts a 32-pair colon SHA-256 and rejects otherwise", () => {
    expect(isSha256Fingerprint(SHA)).toBe(true)
    expect(isSha256Fingerprint(SHA.slice(0, -3))).toBe(false) // short
    expect(isSha256Fingerprint("ZZ:CD:EF")).toBe(false) // non-hex + short
  })

  it("accepts a bare hostname and rejects schemes/paths", () => {
    expect(isHostname("app.acme.com")).toBe(true)
    expect(isHostname("https://app.acme.com")).toBe(false)
    expect(isHostname("app.acme.com/verify")).toBe(false)
    expect(isHostname("localhost")).toBe(false) // no dot
  })
})

describe("substituteAasa", () => {
  const template = `{ "applinks": { "details": [ { "appID": "{{APPLE_TEAM_ID}}.{{IOS_BUNDLE_ID}}" } ] }, "webcredentials": { "apps": ["{{APPLE_TEAM_ID}}.{{IOS_BUNDLE_ID}}"] } }`
  it("replaces both placeholders in every occurrence", () => {
    const out = substituteAasa(template, { teamId: "ABCDE12345", iosBundle: "com.acme.app" })
    expect(out).not.toMatch(/\{\{/)
    expect(out).toContain("ABCDE12345.com.acme.app")
    expect(aasaConfigured(out)).toBe(true)
    expect(aasaConfigured(template)).toBe(false)
  })
})

describe("substituteAssetlinks", () => {
  const template = `[{ "target": { "package_name": "{{ANDROID_PACKAGE}}", "sha256_cert_fingerprints": ["{{ANDROID_CERT_SHA256}}"] } }]`
  it("replaces package + fingerprint", () => {
    const out = substituteAssetlinks(template, { androidPackage: "com.acme.app", sha256: SHA })
    expect(out).not.toMatch(/\{\{/)
    expect(out).toContain("com.acme.app")
    expect(out).toContain(SHA)
    expect(assetlinksConfigured(out)).toBe(true)
  })
})

describe("substituteAppConfig", () => {
  const template = `
  ios: {
    bundleIdentifier: "com.example.mlabs",
    associatedDomains: ["applinks:mlabs.example.com"],
  },
  android: {
    package: "com.example.mlabs",
    intentFilters: [{ data: [{ scheme: "https", host: "mlabs.example.com" }] }],
  },`

  it("field-targets bundle vs package and replaces both host occurrences", () => {
    const out = substituteAppConfig(template, {
      iosBundle: "com.acme.ios",
      androidPackage: "com.acme.droid",
      host: "app.acme.com",
    })
    expect(out).toContain('bundleIdentifier: "com.acme.ios"')
    expect(out).toContain('package: "com.acme.droid"')
    expect(out).toContain("applinks:app.acme.com")
    expect(out).toContain('host: "app.acme.com"')
    expect(out).not.toContain("com.example.mlabs")
    expect(out).not.toContain("mlabs.example.com")
    expect(appConfigConfigured(out)).toBe(true)
    expect(appConfigConfigured(template)).toBe(false)
  })

  it("leaves an already-customized file unchanged (no template value present)", () => {
    const custom = `bundleIdentifier: "com.real.app", package: "com.real.app", host: "real.com"`
    expect(substituteAppConfig(custom, { iosBundle: "x.y.z", androidPackage: "x.y.z", host: "h.com" })).toBe(custom)
  })

  it("treats a doc comment mentioning com.example.mlabs as configured (value-targeted)", () => {
    const commentOnly = '// BUNDLE_ID PLACEHOLDER: `com.example.mlabs` is a template-safe name.\n  bundleIdentifier: "com.real.app",\n  package: "com.real.app",'
    expect(appConfigConfigured(commentOnly)).toBe(true)
  })
})
