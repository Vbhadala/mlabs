// Public surface of features/messages. Server entry points stay under
// ./server — never barrel them here so client components can't import them
// by accident. Cross-feature callers should import directly:
//
//   import { sendMessage } from "@/features/messages/server/messages"
//
// Components are exported here for the inbox + thread pages to mount.

export { ConversationsList } from "./components/conversations-list"
export { Thread } from "./components/thread"
export { NewConversationForm } from "./components/new-conversation-form"
export type { ConversationListItem, MessageRow } from "./types"
