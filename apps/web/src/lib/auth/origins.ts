// Builds the list of additional trusted origins passed to Better Auth.
//
// Better Auth already auto-trusts `new URL(baseURL).origin` (see
// node_modules/better-auth/dist/context/helpers.mjs → getTrustedOrigins), so
// we deliberately do NOT include BETTER_AUTH_URL here. This helper adds:
//   - cross-port localhost entries so dev across ports 3000/5000 works
//   - the Replit dev domain so the *.replit.dev preview iframe's Origin
//     header is accepted while the server runs at localhost:5000
//
// Forks that need to allow additional custom-domain origins can set
// BETTER_AUTH_TRUSTED_ORIGINS (comma-separated) — Better Auth reads it
// natively. See .env.example.

export function buildTrustedOrigins(input: {
  replitDevDomain?: string | undefined
}): string[] {
  const list = ["http://localhost:3000", "http://localhost:5000"]
  if (input.replitDevDomain) {
    list.push(`https://${input.replitDevDomain}`)
  }
  return list
}
