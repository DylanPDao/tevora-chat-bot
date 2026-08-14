"use client";

import { SquarePen } from "lucide-react";
import { useRouter } from "next/navigation";

import { useCreateConversation } from "@/features/conversations/hooks/use-create-conversation";
import { Button } from "@/components/ui/button";

/**
 * Creates an empty thread and opens it.
 *
 * This is the interim shape. Decisions #13 and #14 together mean a conversation
 * should be created *with* its opening message — explicitly rather than lazily
 * inside `/api/chat`, and titled from that message. There is no composer until
 * Phase 3, so for now this creates an untitled thread and Phase 3 changes the
 * caller to pass `firstMessage`. The endpoint and service do not change.
 */
export function NewChatButton(): React.ReactNode {
  const router = useRouter();
  const { mutate, isPending } = useCreateConversation();

  return (
    <Button
      variant="outline"
      className="w-full justify-start"
      disabled={isPending}
      onClick={() => {
        mutate(undefined, {
          // Navigate only once the id exists — there is nothing to route to
          // before the server assigns one, which is the round trip decision
          // #13 accepted in exchange for keeping creation out of the
          // streaming path.
          onSuccess: (conversation) => router.push(`/chat/${conversation.id}`),
        });
      }}
    >
      <SquarePen className="size-4" />
      {isPending ? "Creating…" : "New chat"}
    </Button>
  );
}
