// Postmark driver — the default for production. Sends inline (no jobs runner;
// per PLAN.md T9). On failure, throws — caller's Server Action surfaces a
// retry-able error to the user.

import "server-only"
import { ServerClient } from "postmark"
import { env } from "@/config/env"
import type { EmailDriver, SendArgs, SendResult } from "../types"

let _client: ServerClient | null = null

function getClient(): ServerClient {
  if (!_client) {
    if (!env.POSTMARK_SERVER_TOKEN) {
      throw new Error("POSTMARK_SERVER_TOKEN is required to use the postmark driver")
    }
    _client = new ServerClient(env.POSTMARK_SERVER_TOKEN)
  }
  return _client
}

export const postmarkDriver: EmailDriver = {
  name: "postmark",
  async send(args: SendArgs): Promise<SendResult> {
    if (!env.POSTMARK_FROM_EMAIL) {
      throw new Error("POSTMARK_FROM_EMAIL is required to send via postmark")
    }
    const result = await getClient().sendEmailWithTemplate({
      From: args.fromName
        ? `${args.fromName} <${env.POSTMARK_FROM_EMAIL}>`
        : env.POSTMARK_FROM_EMAIL,
      To: args.to,
      TemplateAlias: args.templateAlias,
      TemplateModel: args.variables,
      MessageStream: "outbound",
    })
    return { messageId: result.MessageID }
  },
}
