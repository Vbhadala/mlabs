/**
 * setup-deeplinks
 * ---------------
 * Write-side companion to `pnpm verify:deeplinks`. Substitutes the per-fork
 * universal-link values into all three source files in one shot, with
 * validation:
 *
 *   apps/web/public/.well-known/apple-app-site-association  ({{APPLE_TEAM_ID}}, {{IOS_BUNDLE_ID}})
 *   apps/web/public/.well-known/assetlinks.json            ({{ANDROID_PACKAGE}}, {{ANDROID_CERT_SHA256}})
 *   apps/mobile/app.config.ts                              (com.example.mlabs ×2, mlabs.example.com ×2)
 *
 * Getting any of these wrong (esp. pasting the *upload* key SHA instead of the
 * *app-signing* key) makes universal links silently fall back to the browser.
 *
 * Zero deps (Node readline). Idempotent: re-running once configured is a no-op.
 * After deploying, verify with: pnpm verify:deeplinks -- https://<host>
 *
 * Usage: pnpm setup-deeplinks   (interactive; needs a TTY)
 */

import { createInterface } from "node:readline/promises"
import { readFileSync, writeFileSync, existsSync } from "node:fs"
import path from "node:path"

const RESET = "\x1b[0m"
const RED = "\x1b[31m"
const GREEN = "\x1b[32m"
const YELLOW = "\x1b[33m"
const DIM = "\x1b[2m"
const BOLD = "\x1b[1m"

// ---------- validators (pure) ----------

export const isTeamId = (s: string): boolean => /^[A-Z0-9]{10}$/.test(s)
export const isReverseDomain = (s: string): boolean =>
  /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/.test(s)
export const isSha256Fingerprint = (s: string): boolean =>
  /^([0-9A-Fa-f]{2}:){31}[0-9A-Fa-f]{2}$/.test(s)
export const isHostname = (s: string): boolean =>
  /^(?!-)[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+$/.test(s) && !s.includes("/")

// ---------- substitutions (pure) ----------

export interface DeeplinkValues {
  teamId: string
  iosBundle: string
  androidPackage: string
  sha256: string
  host: string
}

export function substituteAasa(content: string, v: Pick<DeeplinkValues, "teamId" | "iosBundle">): string {
  return content
    .replaceAll("{{APPLE_TEAM_ID}}", v.teamId)
    .replaceAll("{{IOS_BUNDLE_ID}}", v.iosBundle)
}

export function substituteAssetlinks(
  content: string,
  v: Pick<DeeplinkValues, "androidPackage" | "sha256">,
): string {
  return content
    .replaceAll("{{ANDROID_PACKAGE}}", v.androidPackage)
    .replaceAll("{{ANDROID_CERT_SHA256}}", v.sha256)
}

// app.config.ts ships literal example values (not {{placeholders}}). Bundle vs
// package are field-targeted (they may differ); the host appears in both
// ios.associatedDomains (`applinks:mlabs.example.com`) and
// android.intentFilters (`host: "mlabs.example.com"`) — one value, both spots.
export function substituteAppConfig(
  content: string,
  v: Pick<DeeplinkValues, "iosBundle" | "androidPackage" | "host">,
): string {
  return content
    .replace(/bundleIdentifier:\s*"com\.example\.mlabs"/, `bundleIdentifier: "${v.iosBundle}"`)
    .replace(/package:\s*"com\.example\.mlabs"/, `package: "${v.androidPackage}"`)
    .replaceAll("mlabs.example.com", v.host)
}

// ---------- state detection (pure) ----------

export function aasaConfigured(content: string): boolean {
  return !content.includes("{{APPLE_TEAM_ID}}") && !content.includes("{{IOS_BUNDLE_ID}}")
}
export function assetlinksConfigured(content: string): boolean {
  return !content.includes("{{ANDROID_PACKAGE}}") && !content.includes("{{ANDROID_CERT_SHA256}}")
}
// Value-targeted: `com.example.mlabs` also appears in the file's explanatory
// comment, which substitution intentionally leaves (it's documentation). So
// "configured" means the config *values* are substituted, not that the string
// is absent everywhere.
export function appConfigConfigured(content: string): boolean {
  return (
    !/bundleIdentifier:\s*"com\.example\.mlabs"/.test(content) &&
    !/package:\s*"com\.example\.mlabs"/.test(content) &&
    !content.includes("mlabs.example.com")
  )
}

// ---------- runner ----------

interface Target {
  label: string
  path: string
}

export async function main(): Promise<number> {
  const cwd = process.cwd()
  const aasa: Target = { label: "apple-app-site-association", path: path.join(cwd, "apps/web/public/.well-known/apple-app-site-association") }
  const assetlinks: Target = { label: "assetlinks.json", path: path.join(cwd, "apps/web/public/.well-known/assetlinks.json") }
  const appConfig: Target = { label: "app.config.ts", path: path.join(cwd, "apps/mobile/app.config.ts") }

  for (const t of [aasa, assetlinks, appConfig]) {
    if (!existsSync(t.path)) {
      console.error(`${RED}✗${RESET} missing ${path.relative(cwd, t.path)} — run from the repo root.`)
      return 1
    }
  }

  const aasaContent = readFileSync(aasa.path, "utf8")
  const assetlinksContent = readFileSync(assetlinks.path, "utf8")
  const appConfigContent = readFileSync(appConfig.path, "utf8")

  // Idempotency — nothing left to substitute anywhere.
  if (aasaConfigured(aasaContent) && assetlinksConfigured(assetlinksContent) && appConfigConfigured(appConfigContent)) {
    console.log(`${GREEN}✓${RESET} deep-link values already configured — nothing to do.`)
    return 0
  }

  console.log(`${BOLD}mstack setup-deeplinks${RESET} — configure universal links\n`)

  if (!process.stdin.isTTY) {
    console.error(
      `${RED}✗${RESET} needs an interactive terminal. Provide: Apple Team ID, iOS bundle ID, ` +
        `Android package, app-signing SHA-256, deep-link host. See docs/fork-setup.md.`,
    )
    return 1
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout })
  try {
    const askValidated = async (prompt: string, validate: (s: string) => boolean, hint: string, fallback?: string): Promise<string> => {
      for (;;) {
        const raw = (await rl.question(prompt)).trim()
        const value = raw === "" && fallback !== undefined ? fallback : raw
        if (validate(value)) return value
        console.log(`  ${RED}✗${RESET} ${hint}`)
      }
    }

    const teamId = await askValidated(
      `Apple Team ID ${DIM}(10 chars, e.g. ABCDE12345)${RESET}\n> `,
      isTeamId,
      "expected 10 uppercase letters/digits.",
    )
    const iosBundle = await askValidated(
      `iOS bundle ID ${DIM}(reverse-domain, e.g. com.acme.app)${RESET}\n> `,
      isReverseDomain,
      "expected a reverse-domain like com.acme.app.",
    )
    const androidPackage = await askValidated(
      `Android package ${DIM}(Enter = same as iOS: ${iosBundle})${RESET}\n> `,
      isReverseDomain,
      "expected a reverse-domain like com.acme.app.",
      iosBundle,
    )
    const sha256 = await askValidated(
      `Android ${BOLD}app-signing${RESET} SHA-256 ${DIM}(NOT the upload key; AA:BB:…:FF)${RESET}\n> `,
      isSha256Fingerprint,
      "expected 32 hex byte-pairs separated by colons.",
    )
    const host = await askValidated(
      `Deep-link host ${DIM}(the deployed web domain, e.g. app.acme.com)${RESET}\n> `,
      isHostname,
      "expected a hostname like app.acme.com (no scheme, no path).",
    )

    const nextAasa = substituteAasa(aasaContent, { teamId, iosBundle })
    const nextAssetlinks = substituteAssetlinks(assetlinksContent, { androidPackage, sha256 })
    const nextAppConfig = substituteAppConfig(appConfigContent, { iosBundle, androidPackage, host })

    const writes: Array<{ t: Target; before: string; after: string }> = [
      { t: aasa, before: aasaContent, after: nextAasa },
      { t: assetlinks, before: assetlinksContent, after: nextAssetlinks },
      { t: appConfig, before: appConfigContent, after: nextAppConfig },
    ]

    console.log()
    for (const w of writes) {
      if (w.before === w.after) {
        // app.config.ts is the likely culprit if a fork already hand-edited it.
        console.log(`  ${YELLOW}!${RESET} ${w.t.label} unchanged — no template value matched; check it manually.`)
        continue
      }
      writeFileSync(w.t.path, w.after)
      console.log(`  ${GREEN}✓${RESET} ${w.t.label}`)
    }

    console.log(`\n${BOLD}Next:${RESET} after deploying, verify from the wild:`)
    console.log(`  ${DIM}pnpm verify:deeplinks -- https://${host}${RESET}`)
    return 0
  } finally {
    rl.close()
  }
}

const isDirectRun =
  typeof process !== "undefined" &&
  process.argv[1] &&
  import.meta.url === `file://${path.resolve(process.argv[1])}`

if (isDirectRun) {
  main().then(
    (code) => process.exit(code),
    (err) => {
      console.error(`unexpected error: ${(err as Error).stack ?? err}`)
      process.exit(1)
    },
  )
}
