import type { UIMessage } from "ai";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { ChatThread } from "@/features/messages/components/chat-thread";
import { auth } from "@/server/auth";
import { getConversation } from "@/server/features/conversations/services/conversation-service";
import { listMessages } from "@/server/features/messages/services/message-service";

/**
 * A single thread. History is loaded here rather than fetched from the client,
 * so the conversation renders complete on first paint with no loading state and
 * no round trip — this is a Server Component, so it calls the services directly.
 *
 * That is also why there is no `GET /api/conversations/[id]` or
 * `GET /api/messages`: no client needs either, and an endpoint that exists for
 * nobody is a surface to secure for no reason.
 */

/**
 * Wrapped in `cache` because `generateMetadata` and the component both need it —
 * without this, every request runs the session read and both queries twice. The
 * cache is per-request, so it cannot leak one user's thread into another's
 * render.
 */
const loadThread = cache(async (conversationId: string) => {
  const session = await auth();

  if (!session) {
    notFound();
  }

  const userId = session.user.id;

  const conversation = await getConversation({ id: conversationId, userId });

  // Null covers "no such conversation" and "belongs to someone else" alike, so
  // browsing to another user's id is indistinguishable from browsing to one
  // that was never real.
  if (!conversation) {
    notFound();
  }

  const messages = await listMessages({ conversationId, userId });

  return { conversation, messages };
});

export async function generateMetadata({
  params,
}: PageProps<"/chat/[conversationId]">): Promise<Metadata> {
  const { conversationId } = await params;
  const { conversation } = await loadThread(conversationId);

  return { title: conversation.title };
}

export default async function ConversationPage({
  params,
}: PageProps<"/chat/[conversationId]">): Promise<React.ReactNode> {
  const { conversationId } = await params;
  const { messages } = await loadThread(conversationId);

  return (
    <ChatThread
      conversationId={conversationId}
      // `parts` round-trips verbatim through the database, which is the whole
      // reason it is stored as JSON rather than reconstructed from `text` —
      // seeding `useChat` needs the same shape the stream produced.
      initialMessages={messages.map(
        (message): UIMessage => ({
          id: message.id,
          role: message.role === "USER" ? "user" : "assistant",
          parts: message.parts as UIMessage["parts"],
        }),
      )}
    />
  );
}
