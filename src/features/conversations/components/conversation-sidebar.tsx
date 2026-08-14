"use client";

import { useParams } from "next/navigation";
import { useState } from "react";

import { SignOutButton } from "@/features/auth/components/sign-out-button";
import type { Conversation } from "@/features/conversations/api/conversations-api";
import { ConversationList } from "@/features/conversations/components/conversation-list";
import { DeleteConversationDialog } from "@/features/conversations/components/delete-conversation-dialog";
import { NewChatButton } from "@/features/conversations/components/new-chat-button";
import { useConversations } from "@/features/conversations/hooks/use-conversations";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

/**
 * The sidebar shell: fetches the list, holds which row is awaiting
 * confirmation, and lays out header / list / footer.
 *
 * The active id comes from `useParams`, not a prop. The layout that renders
 * this is a Server Component and does not re-render on client-side navigation
 * between threads, so a prop would go stale the moment you opened a second
 * conversation.
 */
export function ConversationSidebar(): React.ReactNode {
  const { data, isPending, error } = useConversations();
  const params = useParams<{ conversationId?: string }>();
  const activeId = params?.conversationId;

  // Held here rather than per row, so one dialog is mounted for the whole list
  // instead of one per conversation.
  const [pendingDelete, setPendingDelete] = useState<Conversation | null>(null);

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r">
      <div className="flex flex-col gap-2 p-2">
        <p className="px-1 text-sm font-medium">Conversations</p>
        <NewChatButton />
      </div>

      <Separator />

      <ScrollArea className="flex-1">
        <ConversationList
          conversations={data}
          isPending={isPending}
          error={error}
          activeId={activeId}
          onRequestDelete={setPendingDelete}
        />
      </ScrollArea>

      <Separator />

      <div className="p-2">
        <SignOutButton />
      </div>

      <DeleteConversationDialog
        conversation={pendingDelete}
        isActive={pendingDelete?.id === activeId}
        onClose={() => setPendingDelete(null)}
      />
    </aside>
  );
}
