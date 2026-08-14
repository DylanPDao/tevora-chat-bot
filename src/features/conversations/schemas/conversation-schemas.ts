import { z } from "zod";

/**
 * The conversation contracts, imported by the client fetchers *and* the route
 * handlers so a rule cannot be enforced on one side and not the other. No
 * `server-only` here on purpose — that import would make a client component
 * fail to build.
 */

/**
 * Titles are derived, never client-supplied: a conversation is named after the
 * message that started it (see the service). Accepting a `title` field instead
 * would be a separate feature — renaming — and it isn't one we have.
 *
 * The cap is deliberately generous rather than a real message-length rule; that
 * belongs with messages in Phase 3. It exists so an unbounded body can't be
 * posted at this endpoint, not to constrain what someone can say.
 */
export const FIRST_MESSAGE_MAX = 10_000;

export const createConversationSchema = z.object({
  /**
   * Optional because the sidebar's "New chat" creates an empty thread, while
   * the composer creates one already carrying its opening message. Both go
   * through the same endpoint; only the title differs.
   */
  firstMessage: z
    .string()
    .trim()
    .max(FIRST_MESSAGE_MAX, "That message is too long.")
    .optional(),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
