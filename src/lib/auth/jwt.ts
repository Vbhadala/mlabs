// Phase 5.5: JWT access tokens for mobile.
//
// Mobile holds two credentials:
//  - Refresh: the long-lived Better Auth session token (7d), in SecureStore.
//  - Access: a short-lived JWT (1h) issued by /api/auth/refresh.
//
// JWT format: HS256 signed with BETTER_AUTH_SECRET. Payload carries `sub` (user
// id), `role`, `email`, `iat`, `exp`. Verification is stateless (no DB hit), so
// every authed /api/* call on mobile costs one HMAC verify, not one Postgres
// query. Revocation on admin ban happens via session-row delete: the refresh
// endpoint requires a valid session row, so a banned user cannot obtain a new
// JWT after their current one expires (max 1h window).

import "server-only"
import { SignJWT, jwtVerify, type JWTPayload } from "jose"
import { env } from "@/config/env"

const ISSUER = "muscat-mobile"
const ALG = "HS256"
const ACCESS_TTL_SECONDS = 60 * 60 // 1h

const secretKey = () => new TextEncoder().encode(env.BETTER_AUTH_SECRET)

export interface AccessTokenPayload extends JWTPayload {
  sub: string
  email: string
  role: string
}

export async function signAccessToken(user: {
  id: string
  email: string
  role: string
}): Promise<{ token: string; expiresIn: number }> {
  const token = await new SignJWT({ email: user.email, role: user.role })
    .setProtectedHeader({ alg: ALG })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL_SECONDS}s`)
    .setIssuer(ISSUER)
    .sign(secretKey())
  return { token, expiresIn: ACCESS_TTL_SECONDS }
}

// Returns the decoded payload if the JWT is valid and unexpired.
// Returns null on any verification failure (bad signature, expired, wrong issuer,
// missing required claim). Never throws — callers branch on null.
export async function verifyAccessToken(
  jwt: string,
): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(jwt, secretKey(), {
      issuer: ISSUER,
      algorithms: [ALG],
    })
    if (typeof payload.sub !== "string") return null
    if (typeof payload.email !== "string") return null
    if (typeof payload.role !== "string") return null
    return payload as AccessTokenPayload
  } catch {
    return null
  }
}

// Extract bearer token from an Authorization header. Returns null if missing
// or malformed. Used by both the JWT path and Better Auth's bearer plugin.
export function extractBearerToken(authHeader: string | null | undefined): string | null {
  if (!authHeader) return null
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  return match ? match[1].trim() : null
}
