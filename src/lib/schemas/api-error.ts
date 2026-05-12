// Locked wire format for /api/* errors (OV7 in PHASE_5_5.md).
//
// Every route returns one shape so web + mobile clients can branch on `code`
// instead of parsing a free-form string. The Zod schema doubles as the runtime
// contract — clients can validate responses before reading them.
//
// Pure Zod, no Drizzle (enforced by eslint-rules/no-drizzle-in-schemas.js).

import { NextResponse } from "next/server"
import { z } from "zod"

export const ApiErrorResponse = z.object({
  error: z.object({
    /** Machine-readable; clients branch on this. snake_case, namespaced by
     *  feature (e.g. "messages.user_not_found", "auth.unauthenticated"). */
    code: z.string().min(1),
    /** Human-readable; safe to surface in toasts/inline errors. */
    message: z.string().min(1),
    /** Optional form field this error pertains to (for inline validation). */
    field: z.string().optional(),
  }),
})

export type ApiErrorResponse = z.infer<typeof ApiErrorResponse>

/**
 * Server helper — returns a NextResponse matching ApiErrorResponse.
 *
 * Status is the HTTP status code; the body is always the locked envelope.
 * Use it everywhere instead of hand-rolling `{ error: "..." }` objects.
 */
export function apiError(
  status: number,
  code: string,
  message: string,
  field?: string,
): NextResponse<ApiErrorResponse> {
  return NextResponse.json<ApiErrorResponse>(
    { error: { code, message, ...(field ? { field } : {}) } },
    { status },
  )
}
