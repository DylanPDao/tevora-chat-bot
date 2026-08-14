import type { Metadata } from "next";

import { NewConversationComposer } from "@/features/messages/components/new-conversation-composer";

export const metadata: Metadata = { title: "New chat" };

/**
 * The no-conversation-selected state is now where a conversation starts: type a
 * message, and it becomes the thread's first message and its title.
 */
export default function ChatPage(): React.ReactNode {
  return <NewConversationComposer />;
}
