// Driver selection — auto-pick based on env. Use the typed wrappers in
// ./templates.ts (sendVerifyEmail, sendPasswordResetEmail, etc.) for actual
// sending; this module just exposes the active driver.

import "server-only"
import { env } from "@/config/env"
import { consoleDriver } from "./drivers/console"
import { postmarkDriver } from "./drivers/postmark"
import type { EmailDriver } from "./types"

let _driver: EmailDriver | null = null

export function getEmailDriver(): EmailDriver {
  if (_driver) return _driver
  _driver = env.POSTMARK_SERVER_TOKEN ? postmarkDriver : consoleDriver
  return _driver
}

/** Test-only: override the active driver. Resets after the test. */
export function _setDriverForTesting(driver: EmailDriver | null): void {
  _driver = driver
}
