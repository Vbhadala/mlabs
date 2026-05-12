import "server-only"

// Postmark driver — the default for production. Sends inline (no jobs runner;
// per PLAN.md T9). On failure, throws — caller's Server Action surfaces a
// retry-able error to the user.

import { ServerClient } from "postmark"
import type { EmailDriver, SendArgs, SendResult } from "../types"

export interface PostmarkDriverOptions {
  /** Postmark server token (POSTMARK_SERVER_TOKEN). */
  token: string
  /** Verified sender address (POSTMARK_FROM_EMAIL). */
  fromEmail: string
}

export function createPostmarkDriver({
  token,
  fromEmail,
}: PostmarkDriverOptions): EmailDriver {
  let client: ServerClient | null = null
  function getClient(): ServerClient {
    if (!client) client = new ServerClient(token)
    return client
  }

  return {
    name: "postmark",
    async send(args: SendArgs): Promise<SendResult> {
      const result = await getClient().sendEmailWithTemplate({
        From: args.fromName ? `${args.fromName} <${fromEmail}>` : fromEmail,
        To: args.to,
        TemplateAlias: args.templateAlias,
        TemplateModel: args.variables,
        MessageStream: "outbound",
      })
      return { messageId: result.MessageID }
    },
  }
}
