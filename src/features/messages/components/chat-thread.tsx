"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import { conversationsQueryKey } from "@/features/conversations/hooks/use-conversations";
import { Composer } from "@/features/messages/components/composer";
import { MessageList } from "@/features/messages/components/message-list";
import { ScrollArea } from "@/components/ui/scroll-area";

type ChatThreadProps = {
  conversationId: string;
  /** Server-loaded history, so the thread renders complete on first paint. */
  initialMessages: UIMessage[];
};

export function ChatThread({
  conversationId,
  initialMessages,
}: ChatThreadProps): React.ReactNode {
  const queryClient = useQueryClient();

  // Built once per conversation. Recreating it on every render would tear down
  // and re-establish the chat between keystrokes.
  const transport = useMemo(
    () => new DefaultChatTransport<UIMessage>({ api: "/api/chat" }),
    [],
  );

  const { messages, sendMessage, status, error, stop } = useChat({
    // `id` is what the handler reads as the conversation id, so `useChat` and
    // the database agree on which thread this is without a second field.
    id: conversationId,
    messages: initialMessages,
    transport,

    /**
     * The one seam between `useChat` and TanStack Query (decision #4). Query
     * owns the sidebar and never touches these messages; `useChat` owns these
     * messages and never touches the sidebar. A finished turn bumps the
     * conversation's `updatedAt`, so the list needs refetching to reorder —
     * and a first message may have just retitled it.
     */
    onFinish: () => {
      void queryClient.invalidateQueries({ queryKey: conversationsQueryKey });
    },
  });

  // `status` replaces the `isLoading` of older versions. 'submitted' is the gap
  // between sending and the first token, when there is a request in flight but
  // nothing to show yet — both count as busy for the composer.
  const isStreaming = status === "submitted" || status === "streaming";

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ScrollArea className="flex-1">
        <MessageList messages={messages} error={error} />
      </ScrollArea>

      <Composer
        onSend={(text) => void sendMessage({ text })}
        onStop={stop}
        isStreaming={isStreaming}
        autoFocus
      />
    </div>
  );
}
