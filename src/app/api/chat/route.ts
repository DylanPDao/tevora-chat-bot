import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  safeValidateUIMessages,
  streamText,
  toUIMessageStream,
  type TextStreamPart,
  type ToolSet,
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

  const result = streamText({
    model: chatModel,
    messages: modelMessages,
    maxOutputTokens: CHAT_MAX_OUTPUT_TOKENS,
  });

  // `streamText` does not throw — a rejected request (bad key, no credit, rate
  // limit) arrives as an `error` part once the stream is read. Waiting for the
  // opening parts before constructing the Response is what makes a 502
  // reachable at all: once the stream is handed back, the 200 is already sent
  // and the client gets an opaque in-band error instead of our envelope.
  //
  // The cost is the request's own latency, not the whole generation — the probe
  // stops the moment content starts. `tee` keeps the body copy intact, so
  // nothing read here is lost.
  const [probeStream, bodyStream] = result.stream.tee();

  if (await failedBeforeContent(probeStream)) {
    return modelUnavailable();
  }

  return createUIMessageStreamResponse({
      stream: toUIMessageStream({
        stream: bodyStream,
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
}

/**
 * Parts that mean the model call got far enough to be worth streaming. Anything
 * from here on is the model's own output, and a failure after this point can
 * only be reported in-band — the status line is long gone.
 */
const CONTENT_HAS_STARTED: ReadonlySet<string> = new Set([
  "text-start",
  "reasoning-start",
  "tool-input-start",
  "tool-call",
  "file",
  "source",
  "finish",
]);

/**
 * Reads the stream's opening parts and reports whether it failed before
 * producing anything. Resolves as soon as the answer is known, so a healthy
 * call is delayed only by its own time-to-first-token.
 */
async function failedBeforeContent(
  probe: ReadableStream<TextStreamPart<ToolSet>>,
): Promise<boolean> {
  const reader = probe.getReader();

  try {
    for (;;) {
      const { done, value } = await reader.read();

      // A stream that ends without content and without an error is odd but not
      // a transport failure — let it through and end as an empty turn, which
      // persists nothing.
      if (done) {
        return false;
      }

      if (value.type === "error" || value.type === "abort") {
        return true;
      }

      if (CONTENT_HAS_STARTED.has(value.type)) {
        return false;
      }
    }
  } finally {
    // Cancels only this branch of the tee; the body copy is untouched.
    void reader.cancel();
  }
}
