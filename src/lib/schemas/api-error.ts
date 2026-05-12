// Next.js helper that builds an ApiErrorResponse-shaped NextResponse.
//
// The wire-format Zod schema (ApiErrorResponse, ApiErrorBody) lives in the
// shared @mlabs/validators package — it's pure Zod and consumed by mobile
// too. This file is the server-side helper that wraps that contract for
// Next.js route handlers and Server Actions.

import { NextResponse } from "next/server";
import { ApiErrorResponse } from "@mlabs/validators";

// Re-export the schema so the existing `import { ApiErrorResponse } from
// "@/lib/schemas/api-error"` import path keeps working during the migration.
export { ApiErrorResponse, ApiErrorBody } from "@mlabs/validators";
export type { ApiErrorResponse as ApiErrorResponseType } from "@mlabs/validators";

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
  );
}
