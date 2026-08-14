import { auth } from "@/server/auth";
import { deleteConversation } from "@/server/features/conversations/services/conversation-service";
import { notFound, unauthenticated } from "@/shared/http";

/**
 * The id comes from the URL and is therefore untrusted. It is never used alone:
 * the service deletes only where the id *and* the session user match, so a
 * request for someone else's conversation removes nothing.
 *
 * That miss returns the same 404, with the same body, as an id that never
 * existed — so the response cannot be used to discover which conversation ids
 * are real.
 */
export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/conversations/[id]">,
): Promise<Response> {
  const session = await auth();

  if (!session) {
    return unauthenticated();
  }

  const { id } = await context.params;

  const deleted = await deleteConversation({ id, userId: session.user.id });

  if (!deleted) {
    return notFound();
  }

  // Nothing meaningful to return, and the client already knows the id it sent.
  return new Response(null, { status: 204 });
}
