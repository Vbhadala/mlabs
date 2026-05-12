// POST /api/avatar — multipart upload (field "file"). Replaces the current
// avatar; deletes the old object best-effort.
// DELETE /api/avatar — clear avatar (image column set to null + storage delete).
//
// Auth is enforced by requireUser(). Errors return the locked ApiErrorResponse
// shape; the AvatarUploader surfaces err.error.message inline.

import { NextResponse } from "next/server"
import { requireUserJSON } from "@/lib/auth/server"
import {
  AvatarError,
  MAX_BYTES,
  processAndStoreAvatar,
  removeAvatar,
} from "@/features/avatar/server/pipeline"
import { logger } from "@/lib/logger"
import { apiError } from "@/lib/schemas/api-error"
import { clientFromHeaders } from "@/lib/db/audit"

// Bump the route body limit a bit above MAX_BYTES so our own check (in the
// pipeline) is the one that fires, not Next's generic 413.
export const runtime = "nodejs"
export const maxDuration = 30

export async function POST(req: Request) {
  const authResult = await requireUserJSON()
  if (authResult instanceof Response) return authResult
  const me = authResult
  const client = clientFromHeaders(req.headers)

  const form = await req.formData().catch(() => null)
  const file = form?.get("file")
  if (!(file instanceof File)) {
    return apiError(400, "avatar.no_file", "No file provided.", "file")
  }
  if (file.size > MAX_BYTES) {
    return apiError(413, "avatar.too_large", "That image is too large. Max 5 MB.", "file")
  }

  const bytes = Buffer.from(await file.arrayBuffer())

  try {
    const { url } = await processAndStoreAvatar({
      userId: me.id,
      previousImageUrl: me.image ?? null,
      bytes,
      contentType: file.type,
      client,
    })
    return NextResponse.json({ url })
  } catch (err) {
    if (err instanceof AvatarError) {
      return apiError(400, `avatar.${err.code}`, err.message)
    }
    logger.error("avatar upload failed", {
      userId: me.id,
      message: String(err),
    })
    return apiError(500, "avatar.server_error", "Upload failed. Try again.")
  }
}

export async function DELETE(req: Request) {
  const authResult = await requireUserJSON()
  if (authResult instanceof Response) return authResult
  const me = authResult
  const client = clientFromHeaders(req.headers)
  try {
    await removeAvatar({
      userId: me.id,
      previousImageUrl: me.image ?? null,
      client,
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error("avatar remove failed", {
      userId: me.id,
      message: String(err),
    })
    return apiError(500, "avatar.server_error", "Could not remove avatar.")
  }
}
