// Public surface of features/notifications.
//
// Server entry points live in ./server — keep them out of this barrel so
// client components don't accidentally import them. Cross-feature creators
// should import from "@/features/notifications/server/create" directly.

export { NotificationBell } from "./components/notification-bell"
export { NotificationList } from "./components/notification-list"
export type { NotificationBody, NotificationKind } from "./types"
