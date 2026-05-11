// POST /api/avatar — multipart upload (field "file"). Replaces the current
// avatar; deletes the old object best-effort.
// DELETE /api/avatar — clear avatar (image column set to null + storage delete).
//
// Auth is enforced by requireUser(). Errors return JSON with a human-readable
// message; the AvatarUploader surfaces it inline.

import { NextResponse } from "next/server"
import { requireUser } from "@/lib/auth/server"
import {
  AvatarError,
  MAX_BYTES,
  processAndStoreAvatar,
  removeAvatar,
} from "@/features/avatar/server/pipeline"
import { logger } from "@/lib/logger"

// Bump the route body limit a bit above MAX_BYTES so our own check (in the
// pipeline) is the one that fires, not Next's generic 413.
export const runtime = "nodejs"
export const maxDuration = 30

export async function POST(req: Request) {
  const me = await requireUser()

  const form = await req.formData().catch(() => null)
  const file = form?.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "No file provided." },
      { status: 400 },
    )
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "That image is too large. Max 5 MB." },
      { status: 413 },
    )
  }

  const bytes = Buffer.from(await file.arrayBuffer())

  try {
    const { url } = await processAndStoreAvatar({
      userId: me.id,
      previousImageUrl: me.image ?? null,
      bytes,
      contentType: file.type,
    })
    return NextResponse.json({ url })
  } catch (err) {
    if (err instanceof AvatarError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 400 },
      )
    }
    logger.error("avatar upload failed", {
      userId: me.id,
      message: String(err),
    })
    return NextResponse.json(
      { error: "Upload failed. Try again." },
      { status: 500 },
    )
  }
}

export async function DELETE() {
  const me = await requireUser()
  try {
    await removeAvatar({ userId: me.id, previousImageUrl: me.image ?? null })
    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error("avatar remove failed", {
      userId: me.id,
      message: String(err),
    })
    return NextResponse.json(
      { error: "Could not remove avatar." },
      { status: 500 },
    )
  }
}
