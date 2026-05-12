// Mirror of src/lib/schemas/api-error.ts (parser shape only — server has
// apiError() helper, mobile has the Zod schema for response validation).
//
// Keep in sync with canonical. Metro can't reach across src/ → mobile/ so the
// mirror is deliberate; a future shared/ package would dedupe this. See
// PHASE_5_5.md "Shared schemas barrel" + decision A4.

import { z } from "zod"

export const ApiErrorBody = z.object({
  /** Machine-readable; clients branch on this. snake_case, namespaced by
   *  feature (e.g. "messages.user_not_found", "auth.unauthenticated"). */
  code: z.string().min(1),
  /** Human-readable; safe to surface in toasts/inline errors. */
  message: z.string().min(1),
  /** Optional form field this error pertains to (for inline validation). */
  field: z.string().optional(),
})

export const ApiErrorResponse = z.object({
  error: ApiErrorBody,
})

export type ApiErrorResponse = z.infer<typeof ApiErrorResponse>
