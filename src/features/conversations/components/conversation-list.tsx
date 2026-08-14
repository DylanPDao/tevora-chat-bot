"use client";

import type { Conversation } from "@/features/conversations/api/conversations-api";
import { ConversationRow } from "@/features/conversations/components/conversation-row";
import { Skeleton } from "@/components/ui/skeleton";

type ConversationListProps = {
  conversations: Conversation[] | undefined;
  isPending: boolean;
  error: Error | null;
  activeId: string | undefined;
  onRequestDelete: (conversation: Conversation) => void;
};

/**
 * The four states a fetched list can be in, all rendered here so the sidebar
 * stays a shell. Kept as a presentational component — it takes query results
 * rather than calling the hook, which is what lets the sidebar decide when to
 * fetch and keeps this trivial to reason about.
 */
export function ConversationList({
  conversations,
  isPending,
  error,
  activeId,
  onRequestDelete,
}: ConversationListProps): React.ReactNode {
  if (isPending) {
    return (
      <div className="flex flex-col gap-1 p-2" aria-busy="true">
        {/* Fixed widths rather than random ones: a skeleton that changes shape
            on every render reads as flicker, not loading. */}
        {[70, 90, 55, 80].map((width, index) => (
          <Skeleton
            key={index}
            className="h-9 rounded-md"
            style={{ width: `${width}%` }}
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="p-3 text-sm text-destructive">
        Couldn&apos;t load your conversations.
      </p>
    );
  }

  if (!conversations?.length) {
    return (
      <p className="p-3 text-sm text-muted-foreground">
        No conversations yet. Start one above.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-0.5 p-2">
      {conversations.map((conversation) => (
        <li key={conversation.id}>
          <ConversationRow
            conversation={conversation}
            isActive={conversation.id === activeId}
            onRequestDelete={onRequestDelete}
          />
        </li>
      ))}
    </ul>
  );
}
