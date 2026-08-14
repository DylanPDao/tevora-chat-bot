import type { Metadata } from "next";

export const metadata: Metadata = { title: "Chat" };

/**
 * The no-conversation-selected state. Phase 3 replaces this with the composer
 * that starts a new thread — at which point the flow becomes: type here,
 * create the conversation with that message as its title, then navigate to it.
 */
export default function ChatPage(): React.ReactNode {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <p className="text-sm text-muted-foreground">
        Select a conversation, or start a new one.
      </p>
    </div>
  );
}
