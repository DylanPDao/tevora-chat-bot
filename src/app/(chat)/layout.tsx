import type { ReactNode } from "react";

import { ConversationSidebar } from "@/features/conversations/components/conversation-sidebar";

/**
 * The chat shell. The sidebar lives in the layout rather than on each page so
 * it survives navigation between threads — Next preserves the layout across
 * routes in the group, so the conversation list is not refetched and its scroll
 * position is not lost every time you open a different conversation.
 *
 * This stays a Server Component; only the sidebar itself is a client boundary.
 */
export default function ChatLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return (
    <div className="flex flex-1 overflow-hidden">
      <ConversationSidebar />
      <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
