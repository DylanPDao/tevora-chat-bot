import { createConversationSchema } from "@/features/conversations/schemas/conversation-schemas";
import { auth } from "@/server/auth";
import {
  createConversation,
  listConversations,
} from "@/server/features/conversations/services/conversation-service";
import { unauthenticated, validationFailed } from "@/shared/http";

/**
 * auth → validate → call a service → respond. No Prisma here: the ownership
 * filter belongs in the service, in one place, rather than repeated per route
 * where one omission is an IDOR.
 *
 * Middleware does not protect this path — `/api` is excluded from its matcher
 * on purpose — so the `auth()` calls below are the real check, not a
 * convenience.
 */

/** Only ever the caller's own conversations; the service scopes the query. */
export async function GET(): Promise<Response> {
  const session = await auth();

  if (!session) {
    return unauthenticated();
  }

  const conversations = await listConversations(session.user.id);

  return Response.json(conversations);
}

export async function POST(request: Request): Promise<Response> {
  const session = await auth();

  if (!session) {
    return unauthenticated();
  }

  // A malformed *or absent* body is a validation failure, not a 500. Clients
  // always send JSON — `{}` when starting an empty thread — so requiring it
  // keeps this identical to the register handler rather than special-casing
  // an empty request.
  const body: unknown = await request.json().catch(() => null);

  const parsed = createConversationSchema.safeParse(body);

  if (!parsed.success) {
    return validationFailed(parsed.error);
  }

  const conversation = await createConversation({
    userId: session.user.id,
    firstMessage: parsed.data.firstMessage,
  });

  return Response.json(conversation, { status: 201 });
}
