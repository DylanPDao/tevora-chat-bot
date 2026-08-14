"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";

import type { Conversation } from "@/features/conversations/api/conversations-api";
import { cn } from "@/shared/utils";

type ConversationRowProps = {
  conversation: Conversation;
  isActive: boolean;
  onRequestDelete: (conversation: Conversation) => void;
};

/**
 * One sidebar row. Deliberately dumb — it renders and reports intent; the
 * sidebar owns which conversation is being deleted, so the confirmation dialog
 * is mounted once rather than once per row.
 */
export function ConversationRow({
  conversation,
  isActive,
  onRequestDelete,
}: ConversationRowProps): React.ReactNode {
  return (
    <div
      className={cn(
        "group flex items-center gap-1 rounded-md pr-1 text-sm",
        isActive ? "bg-accent" : "hover:bg-accent/50",
      )}
    >
      <Link
        href={`/chat/${conversation.id}`}
        // truncate needs a min-width-0 flex child, or the title pushes the
        // delete button out of the row instead of ellipsising.
        className="min-w-0 flex-1 truncate px-2 py-2"
        title={conversation.title}
      >
        {conversation.title}
      </Link>

      <button
        type="button"
        onClick={() => onRequestDelete(conversation)}
        // Visible on hover for pointer users, but always reachable by keyboard:
        // focus-visible brings it back, so tabbing through the list never
        // lands on an invisible control.
        className={cn(
          "rounded p-1.5 text-muted-foreground opacity-0 transition-opacity",
          "hover:bg-background hover:text-destructive",
          "group-hover:opacity-100 focus-visible:opacity-100",
        )}
        aria-label={`Delete ${conversation.title}`}
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
