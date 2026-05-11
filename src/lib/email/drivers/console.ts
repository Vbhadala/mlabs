// Dev fallback driver: logs the email to console instead of sending.
// Active when POSTMARK_SERVER_TOKEN is unset. Useful for local dev and tests.

import "server-only"
import type { EmailDriver, SendArgs, SendResult } from "../types"

export const consoleDriver: EmailDriver = {
  name: "console",
  async send(args: SendArgs): Promise<SendResult> {
    // Pretty-printed so devs can grab verify URLs etc. from the log
    const { templateAlias, to, variables } = args

    console.log("[email/console]", { templateAlias, to, variables })
    return { messageId: `console-${Date.now()}` }
  },
}
