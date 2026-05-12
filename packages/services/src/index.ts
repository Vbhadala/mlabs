// @mlabs/services — domain-grouped server-side business logic.
//
// Every function takes (db, ctx, args). Authorization checks live in the
// service, not in the route. Cross-domain calls go through the named
// subpath imports below — never reach into sibling ./<domain>/service.ts
// files. The ESLint rule in @mlabs/eslint-config enforces this.
//
// Subpath imports:
//   - @mlabs/services/notifications  — getUnreadCount, listInbox,
//                                       markAllRead, markRead,
//                                       createNotification

export * as notifications from "./notifications"
