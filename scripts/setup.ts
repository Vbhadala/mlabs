/**
 * setup
 * -----
 * One-command first-run setup for a fresh clone / fork. Zero dependencies
 * (Node's built-in readline). Creates .env.local, generates a valid
 * BETTER_AUTH_SECRET, captures DATABASE_URL, and offers to run migrations.
 *
 * Safe + re-runnable:
 *   - Never overwrites an existing .env.local without confirmation.
 *   - Never regenerates a BETTER_AUTH_SECRET that's already set.
 *   - Non-interactive (no TTY, e.g. CI): uses defaults, skips prompts, and
 *     leaves an existing .env.local untouched.
 *
 * Usage: pnpm setup
 */

import { createInterface } from "node:readline/promises"
import { randomBytes } from "node:crypto"
import { spawnSync } from "node:child_process"
import { readFileSync, writeFileSync, existsSync } from "node:fs"
import path from "node:path"

const RESET = "\x1b[0m"
const GREEN = "\x1b[32m"
const YELLOW = "\x1b[33m"
const DIM = "\x1b[2m"
const BOLD = "\x1b[1m"

const DEFAULT_AUTH_URL = "http://localhost:3000"

function getEnvValue(content: string, key: string): string | undefined {
  const m = content.match(new RegExp(`^${key}=(.*)$`, "m"))
  return m ? m[1].trim() : undefined
}

/** Set or replace `KEY=value` in env-file content, preserving the rest. */
function upsertEnv(content: string, key: string, value: string): string {
  const line = `${key}=${value}`
  const re = new RegExp(`^${key}=.*$`, "m")
  if (re.test(content)) return content.replace(re, line)
  return `${content.trimEnd()}\n${line}\n`
}

export async function main(): Promise<number> {
  const cwd = process.cwd()
  const envLocalPath = path.join(cwd, ".env.local")
  const envExamplePath = path.join(cwd, ".env.example")
  const interactive = Boolean(process.stdin.isTTY)

  console.log(`${BOLD}mstack setup${RESET} — configure your local environment\n`)

  const rl = interactive
    ? createInterface({ input: process.stdin, output: process.stdout })
    : null
  const ask = async (q: string): Promise<string> => (rl ? (await rl.question(q)).trim() : "")

  try {
    // 1. Base content: existing .env.local (updated) or a copy of .env.example.
    let content: string
    const hadLocal = existsSync(envLocalPath)
    if (hadLocal) {
      if (interactive) {
        const yn = (await ask(`${YELLOW}.env.local already exists.${RESET} Update it in place? (y/N) `)).toLowerCase()
        if (yn !== "y" && yn !== "yes") {
          console.log(`${DIM}Left .env.local untouched. Run \`pnpm doctor\` to see what's set.${RESET}`)
          return 0
        }
      } else {
        console.log(`${DIM}.env.local exists and no TTY to confirm — leaving it untouched.${RESET}`)
        return 0
      }
      content = readFileSync(envLocalPath, "utf8")
    } else if (existsSync(envExamplePath)) {
      content = readFileSync(envExamplePath, "utf8")
    } else {
      content = ""
    }

    // 2. BETTER_AUTH_SECRET — generate only if empty (never clobber).
    const existingSecret = getEnvValue(content, "BETTER_AUTH_SECRET")
    if (!existingSecret) {
      const secret = randomBytes(32).toString("base64")
      content = upsertEnv(content, "BETTER_AUTH_SECRET", secret)
      console.log(`${GREEN}✓${RESET} generated BETTER_AUTH_SECRET`)
    } else {
      console.log(`${DIM}· BETTER_AUTH_SECRET already set — keeping it${RESET}`)
    }

    // 3. BETTER_AUTH_URL — default if empty.
    if (!getEnvValue(content, "BETTER_AUTH_URL")) {
      content = upsertEnv(content, "BETTER_AUTH_URL", DEFAULT_AUTH_URL)
      console.log(`${GREEN}✓${RESET} set BETTER_AUTH_URL=${DEFAULT_AUTH_URL}`)
    }

    // 4. DATABASE_URL — prompt (skippable).
    let databaseUrl = getEnvValue(content, "DATABASE_URL") ?? ""
    if (interactive) {
      const answer = await ask(
        `\nPaste your Neon ${BOLD}DATABASE_URL${RESET} ${DIM}(console.neon.tech → Connection Details; Enter to skip)${RESET}\n> `,
      )
      if (answer) {
        databaseUrl = answer
        content = upsertEnv(content, "DATABASE_URL", answer)
        console.log(`${GREEN}✓${RESET} set DATABASE_URL`)
      }
    }

    // 5. Write .env.local.
    writeFileSync(envLocalPath, content)
    console.log(`\n${GREEN}✓${RESET} wrote ${path.relative(cwd, envLocalPath) || ".env.local"}`)

    // 6. Offer to migrate if we have a DB.
    if (databaseUrl && interactive) {
      const yn = (await ask(`\nRun database migrations now? (Y/n) `)).toLowerCase()
      if (yn === "" || yn === "y" || yn === "yes") {
        console.log(`${DIM}running pnpm db:migrate…${RESET}`)
        const res = spawnSync("pnpm", ["db:migrate"], {
          stdio: "inherit",
          env: { ...process.env, DATABASE_URL: databaseUrl },
        })
        if (res.status !== 0) {
          console.log(`${YELLOW}!${RESET} migrations did not complete — run \`pnpm db:migrate\` manually.`)
        }
      }
    }

    // 7. Closing hint.
    console.log(`\n${BOLD}Next:${RESET}`)
    console.log(`  ${DIM}pnpm doctor${RESET}   check your config + database`)
    console.log(`  ${DIM}pnpm dev${RESET}      start the web app`)
    if (!databaseUrl) {
      console.log(`\n${YELLOW}Note:${RESET} no DATABASE_URL yet — signup/persistence stays broken until you set one.`)
    }
    return 0
  } finally {
    rl?.close()
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
