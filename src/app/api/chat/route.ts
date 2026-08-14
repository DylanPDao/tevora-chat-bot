import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  safeValidateUIMessages,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";

import { chatRequestSchema } from "@/features/messages/schemas/message-schemas";
import { auth } from "@/server/auth";
import {
  appendMessage,
  listMessages,
  textFromParts,
  type MessagePart,
} from "@/server/features/messages/services/message-service";
import { CHAT_MAX_OUTPUT_TOKENS, chatModel } from "@/server/model";
import {
  invalidRequest,
  modelUnavailable,
  notFound,
  unauthenticated,
  validationFailed,
} from "@/shared/http";

/**
 * The streaming turn: auth → validate → persist the user message → call the
 * model → stream → persist the assistant message when it completes.
 *
 * The ordering is the point (see CLAUDE.md). The user's message is committed
 * before the model is called, so a failed call leaves a complete user turn and
 * no assistant row — the history stays consistent and the user can retry. The
 * inverse ordering would lose the message the user typed.
 */

/**
 * The transport POSTs the *entire* message array from the browser every turn,
 * so it is treated as untrusted input: only the newest user message is taken
 * from it, and the history sent to the model is re-read from the database.
 * Replaying the client's array would let someone fabricate assistant turns in
 * their own context — cheap to prevent, and one query.
 */
export async function POST(request: Request): Promise<Response> {
  const session = await auth();

  if (!session) {
    return unauthenticated();
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = chatRequestSchema.safeParse(body);

  if (!parsed.success) {
    return validationFailed(parsed.error);
  }

  // The SDK owns the UIMessage shape, so it validates it. Hand-rolling this
  // would mean maintaining a copy that drifts the moment parts gain a type.
  const validated = await safeValidateUIMessages({ messages: parsed.data.messages });

  if (!validated.success) {
    return invalidRequest("Those messages aren't in a shape we can read.");
  }

  const incoming = validated.data.at(-1);

  // The turn is driven by the newest message, and it has to be the user's —
  // anything else means the client is out of step with its own state.
  if (!incoming || incoming.role !== "user") {
    return invalidRequest("The last message must be from the user.");
  }

  const conversationId = parsed.data.id;
  const userId = session.user.id;

  // Also the ownership check: this writes only where the conversation id and
  // the session user both match, so someone else's id persists nothing and
  // returns the same 404 as an id that never existed.
  const persisted = await appendMessage({
    conversationId,
    userId,
    role: "USER",
    parts: incoming.parts as MessagePart[],
  });

  if (!persisted) {
    return notFound();
  }

  // Read back rather than trusting the client's array — this now includes the
  // message just written, in database order.
  const history = await listMessages({ conversationId, userId });

  const modelMessages = await convertToModelMessages(
    history.map((message) => ({
      role: message.role === "USER" ? ("user" as const) : ("assistant" as const),
      parts: message.parts as UIMessage["parts"],
    })),
  );

  try {
    const result = streamText({
      model: chatModel,
      messages: modelMessages,
      maxOutputTokens: CHAT_MAX_OUTPUT_TOKENS,
    });

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({
        stream: result.stream,
        onEnd: async ({ messages, isAborted }) => {
          // Nothing partial gets written. An aborted stream, a refusal, or an
          // error mid-generation all end here with no usable content, and each
          // leaves the turn as user-message-only rather than half an exchange.
          if (isAborted) {
            return;
          }

          const reply = messages.at(-1);

          if (!reply || reply.role !== "assistant") {
            return;
          }

          const parts = reply.parts as MessagePart[];

          // A refusal arrives as a successful response with empty or partial
          // content, so emptiness is the check — not a status code.
          if (!textFromParts(parts)) {
            return;
          }

          await appendMessage({
            conversationId,
            userId,
            role: "ASSISTANT",
            parts,
          });
        },
      }),
    });
  } catch {
    // Only reaches here for a failure raised before the response is returned —
    // a misconfigured client, a rejected request. Once the stream is handed
    // back the status is already sent, so a mid-stream failure surfaces as a
    // stream error instead; either way no assistant message is written.
    return modelUnavailable();
  }
}
