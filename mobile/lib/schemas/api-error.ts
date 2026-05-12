// STUB — replaced with import from src/lib/schemas/api-error.ts after Lane B
// merges (integration step). Lane B owns the canonical Zod schema; this file
// exists so Lane C can typecheck independently in its worktree.

import { z } from "zod";

export const ApiErrorBody = z.object({
  code: z.string(),
  message: z.string(),
  field: z.string().optional(),
});

export const ApiErrorResponse = z.object({
  error: ApiErrorBody,
});

export type ApiErrorResponse = z.infer<typeof ApiErrorResponse>;
