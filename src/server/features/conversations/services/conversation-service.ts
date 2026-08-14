import "server-only";

import { db } from "@/server/db";

/**
 * The only module that touches `db.conversation`.
 *
 * Every function here takes a `userId` and filters on it in the same query that
 * finds the row — never a lookup followed by an ownership check. That is the
 * whole point of the file: `Conversation.userId` is the ownership boundary for
 * this app, and one handler that forgets to apply it is an IDOR. Keeping the
 * filter here means there is exactly one place to audit rather than one per
 * route.
 *
 * Note the deliberate absence of `findUnique`. It can only filter on unique
 * fields, so `findUnique({ where: { id } })` would return another user's row
 * and leave the caller to reject it — which is precisely the pattern this file
 * exists to prevent. `findFirst` takes both.
 */

/** No message bodies — the sidebar only ever needs these three fields. */
export type ConversationSummary = {
  id: string;
  title: string;
  updatedAt: Date;
};

const SUMMARY_SELECT = {
  id: true,
  title: true,
  updatedAt: true,
} as const;

/** Shown when a thread is started without an opening message. */
const DEFAULT_TITLE = "New conversation";

/** Long enough to be recognisable in the sidebar, short enough not to wrap. */
const TITLE_MAX_LENGTH = 50;

/**
 * The instant, free, cannot-fail half of decision #14: the title is the opening
 * message, truncated. A model call rewrites it into a real summary later; if
 * that call never happens or fails, this still stands on its own.
 *
 * Newlines are collapsed first — a pasted multi-line message would otherwise
 * put a line break inside a sidebar row.
 */
function deriveTitle(firstMessage: string | undefined): string {
  const collapsed = firstMessage?.replace(/\s+/g, " ").trim();

  if (!collapsed) {
    return DEFAULT_TITLE;
  }

  if (collapsed.length <= TITLE_MAX_LENGTH) {
    return collapsed;
  }

  return `${collapsed.slice(0, TITLE_MAX_LENGTH).trimEnd()}…`;
}

/**
 * Most recently updated first — the order the sidebar renders, and the order
 * the `[userId, updatedAt DESC]` index already stores, so this stays a single
 * index scan rather than a sort.
 */
export async function listConversations(
  userId: string,
): Promise<ConversationSummary[]> {
  return db.conversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: SUMMARY_SELECT,
  });
}

export async function createConversation({
  userId,
  firstMessage,
}: {
  userId: string;
  firstMessage?: string;
}): Promise<ConversationSummary> {
  return db.conversation.create({
    data: { userId, title: deriveTitle(firstMessage) },
    select: SUMMARY_SELECT,
  });
}

/**
 * `null` covers both "no such conversation" and "belongs to someone else" —
 * the caller cannot distinguish them, so it cannot leak the difference. Handlers
 * turn this into a 404 with the same body either way, and the API never
 * confirms that another user's conversation id is real.
 */
export async function getConversation({
  id,
  userId,
}: {
  id: string;
  userId: string;
}): Promise<ConversationSummary | null> {
  return db.conversation.findFirst({
    where: { id, userId },
    select: SUMMARY_SELECT,
  });
}

/**
 * `deleteMany` rather than `delete`, for the ownership filter: `delete` accepts
 * only a unique field, so enforcing ownership with it means reading the row
 * first and then deleting — two statements, with a window between them. This is
 * one statement that deletes only if both the id and the owner match, and
 * `count` reports whether it did.
 *
 * Returns false when nothing matched, which the handler renders as the same 404
 * that a genuinely missing row produces.
 *
 * Messages go with it: `Message.conversationId` cascades on delete.
 */
export async function deleteConversation({
  id,
  userId,
}: {
  id: string;
  userId: string;
}): Promise<boolean> {
  const { count } = await db.conversation.deleteMany({ where: { id, userId } });

  return count > 0;
}
