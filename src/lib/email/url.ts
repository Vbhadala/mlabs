// Email URL helpers (C1 in PHASE_5_5.md).
//
// Two builders so a single template can emit either a web URL or a deep link
// without sprinkling string concat through the codebase:
//
//   buildAuthUrl   — always returns an https://BETTER_AUTH_URL/... URL.
//                    Used for Better Auth's verify/reset links (those flows
//                    end on the server, regardless of which client started
//                    them).
//   buildAppLinkUrl — returns `scheme://path` when EXPO_SCHEME is configured,
//                    otherwise falls back to the auth URL. Used for "open in
//                    app" CTAs that should jump straight into the installed
//                    Expo app on a phone.
//
// Params are URL-encoded via URLSearchParams (handles tokens with +, /, =, etc.).

import "server-only"
import { env } from "@/config/env"

type Params = Record<string, string | number | boolean | null | undefined>

function appendParams(usp: URLSearchParams, params: Params): void {
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined) continue
    usp.set(k, String(v))
  }
}

function normalizePath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`
}

/** Web URL for the server-side flow (verify-email, reset-password landing). */
export function buildAuthUrl(path: string, params: Params = {}): string {
  // BETTER_AUTH_URL is optional at env-validation time so the build can pass
  // before deploy. At runtime it should always be set; fall back to localhost
  // in dev/test so tests don't have to mock env.
  const base = env.BETTER_AUTH_URL ?? "http://localhost:3000"
  const url = new URL(normalizePath(path), base)
  appendParams(url.searchParams, params)
  return url.toString()
}

/**
 * Deep link to the installed mobile app (e.g. `mlabs://reset-password?token=...`).
 *
 * Falls back to buildAuthUrl when EXPO_SCHEME is unset — web-only forks still
 * get a working email link instead of an invalid `undefined://...` URL.
 */
export function buildAppLinkUrl(path: string, params: Params = {}): string {
  const scheme = env.EXPO_SCHEME
  if (!scheme) {
    return buildAuthUrl(path, params)
  }
  const cleanPath = normalizePath(path).slice(1) // strip leading '/'
  const usp = new URLSearchParams()
  appendParams(usp, params)
  const qs = usp.toString()
  return qs ? `${scheme}://${cleanPath}?${qs}` : `${scheme}://${cleanPath}`
}
