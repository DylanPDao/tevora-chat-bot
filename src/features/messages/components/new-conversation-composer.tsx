"use client";

import { useRouter } from "next/navigation";

import { useCreateConversation } from "@/features/conversations/hooks/use-create-conversation";
import { Composer } from "@/features/messages/components/composer";
import { setPendingMessage } from "@/features/messages/pending-message";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * The composer on `/chat`, where no conversation exists yet.
 *
 * This is what closes decisions #13 and #14 together. The conversation is
 * created explicitly rather than lazily inside `/api/chat` — so `useChat` gets
 * a stable id and the sidebar learns about the thread before streaming starts,
 * instead of both finding out mid-stream. And it is created *carrying* the
 * opening message, which is what the title is derived from; creating first and
 * titling later is what left every thread called "New conversation".
 *
 * The cost is the extra round trip decision #13 accepted: the user waits for an
 * id before their first message is sent. Subsequent messages have none.
 */
export function NewConversationComposer(): React.ReactNode {
  const router = useRouter();
  const { mutate, isPending, error } = useCreateConversation();

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
        <p className="text-sm text-muted-foreground">
          Ask anything to start a new conversation.
        </p>

        {error && (
          <Alert variant="destructive" className="max-w-sm">
            <AlertDescription>
              Couldn&apos;t start that conversation. Try again.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <Composer
        isStreaming={isPending}
        onStop={() => {
          // Creation is a single short request; there is nothing to interrupt.
          // The composer shows a stop control while `isStreaming`, so this
          // exists to satisfy that contract rather than to do anything.
        }}
        onSend={(text) => {
          mutate(
            { firstMessage: text },
            {
              onSuccess: (conversation) => {
                // Handed over in memory, not in the URL — see pending-message.
                setPendingMessage(conversation.id, text);
                router.push(`/chat/${conversation.id}`);
              },
            },
          );
        }}
        autoFocus
      />
    </div>
  );
}
