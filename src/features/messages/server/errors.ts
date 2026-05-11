// Typed errors raised by the server modules. Route handlers map these to
// HTTP responses (404 / 400) — never bubble raw to the client.

export type MessagesErrorCode =
  | "not_found"           // covers non-participant AND missing convo — no enumeration
  | "user_not_found"
  | "self_dm"
  | "invalid_body"

export class MessagesError extends Error {
  constructor(public code: MessagesErrorCode, message: string) {
    super(message)
  }
}
