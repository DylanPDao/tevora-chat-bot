import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { auth } from "@/server/auth";
import { getConversation } from "@/server/features/conversations/services/conversation-service";

/**
 * A single thread. Phase 3 fills this with messages and the composer; for now
 * it exists to prove the ownership check works on a page, not just at the API.
 *
 * The conversation is loaded through the service rather than by fetching our
 * own endpoint — this is a Server Component, so it can call the service
 * directly. That is why there is no `GET /api/conversations/[id]`: no client
 * ever needs one, and an endpoint that exists for nobody is a surface to
 * secure for no reason.
 */
/**
 * Wrapped in `cache` because both `generateMetadata` and the component below
 * need it — without this, every request runs the session read and the query
 * twice. The cache is per-request, so it never leaks one user's row into
 * another's render.
 */
const loadConversation = cache(async (conversationId: string) => {
  const session = await auth();

  // Middleware already redirected unauthenticated visitors, but this page can
  // also be reached by an RSC request, and it needs a userId regardless.
  if (!session) {
    notFound();
  }

  const conversation = await getConversation({
    id: conversationId,
    userId: session.user.id,
  });

  // Null covers "no such conversation" and "belongs to someone else" alike, and
  // both render the same 404 — so browsing to another user's id is
  // indistinguishable from browsing to one that was never real.
  if (!conversation) {
    notFound();
  }

  return conversation;
});

export async function generateMetadata({
  params,
}: PageProps<"/chat/[conversationId]">): Promise<Metadata> {
  const { conversationId } = await params;
  const conversation = await loadConversation(conversationId);

  return { title: conversation.title };
}

export default async function ConversationPage({
  params,
}: PageProps<"/chat/[conversationId]">): Promise<React.ReactNode> {
  const { conversationId } = await params;
  const conversation = await loadConversation(conversationId);

  return (
    <div className="flex flex-1 flex-col p-6">
      <h1 className="text-lg font-semibold">{conversation.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Messages land here in Phase 3.
      </p>
    </div>
  );
}
