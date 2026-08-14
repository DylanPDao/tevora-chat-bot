import { z } from "zod";

/**
 * The `/api/chat` request envelope.
 *
 * Deliberately shallow: it validates the fields *we* read and leaves the shape
 * of `messages` to the SDK's own `validateUIMessages`, which is run in the
 * handler. Hand-rolling a Zod schema for `UIMessage` would mean maintaining a
 * copy of a type the SDK owns — and importing `ai` here would drag it into the
 * client bundle, since this file is shared.
 *
 * `DefaultChatTransport` also sends `trigger` and `messageId`. They are not
 * declared because nothing reads them, and `z.object` ignores unknown keys —
 * adding them would imply a contract we don't honour.
 */
export const chatRequestSchema = z.object({
  /**
   * `useChat`'s `id`, which we set to the conversation id. The handler scopes
   * every query by this *and* the session user, so a client supplying someone
   * else's id gets a 404 rather than their thread.
   */
  id: z.string().min(1, "A conversation id is required."),

  /**
   * Left as `unknown` on purpose — `validateUIMessages` parses it in the
   * handler. Only the presence of a non-empty array is checked here, so a
   * malformed body fails as a 400 before the SDK is involved.
   */
  messages: z.array(z.unknown()).min(1, "At least one message is required."),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
