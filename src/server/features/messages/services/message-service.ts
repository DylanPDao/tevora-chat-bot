import "server-only";

import type { MessageRole, Prisma } from "@prisma/client";

import { db } from "@/server/db";

/**
 * The only module that touches `db.message`.
 *
 * Messages carry no `userId` of their own — ownership lives one join away on
 * `Conversation`. Rather than checking the parent and then writing, both
 * functions here push the ownership filter *into* the statement, the same shape
 * `deleteConversation` uses. A caller cannot forget the check, because there is
 * no unscoped path.
 */

/**
 * The AI SDK's `UIMessage.parts` array, stored verbatim. Deliberately loose: it
 * is the SDK's type, and pinning a narrower one here would mean maintaining a
 * copy that silently disagrees the moment images or tool calls arrive.
 */
export type MessagePart = { type: string; text?: string };

export type MessageRecord = {
  id: string;
  role: MessageRole;
  parts: Prisma.JsonValue;
  createdAt: Date;
};

/**
 * `parts` is the source of truth; `text` is derived for the places that need a
 * plain string — sidebar previews, conversation titles, and any full-text
 * search later. Written only here, alongside `parts`, so the two cannot drift.
 */
export function textFromParts(parts: MessagePart[]): string {
  return parts
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("")
    .trim();
}

/**
 * Oldest first — the order a thread renders, and the order the
 * `[conversationId, createdAt]` index already stores.
 *
 * The ownership filter travels through the relation rather than being applied
 * by the caller, so an unowned conversation id returns an empty list instead of
 * someone else's thread. An empty list is also what a genuinely empty
 * conversation returns; callers that need to tell those apart should load the
 * conversation itself, which 404s.
 */
export async function listMessages({
  conversationId,
  userId,
}: {
  conversationId: string;
  userId: string;
}): Promise<MessageRecord[]> {
  return db.message.findMany({
    where: { conversationId, conversation: { userId } },
    orderBy: { createdAt: "asc" },
    select: { id: true, role: true, parts: true, createdAt: true },
  });
}

/**
 * Appends a message and bumps the conversation's `updatedAt`, in one statement.
 *
 * The write goes through `conversation.update` rather than `message.create`
 * because that is what lets the ownership filter be part of it: Prisma's
 * extended where-unique accepts `{ id, userId }` together, so a conversation
 * belonging to someone else matches nothing and Prisma raises `P2025`. Creating
 * the message directly would mean checking the parent first — two statements,
 * and a window in between.
 *
 * The `updatedAt` bump has to be explicit. Prisma's `@updatedAt` fires when the
 * *conversation* row is written, and inserting a child row is not that — so
 * without this, threads would never reorder and the sidebar's "most recent
 * first" would be decorative.
 *
 * Returns `false` when the conversation does not exist or is not the caller's;
 * handlers render both as the same 404.
 */
export async function appendMessage({
  conversationId,
  userId,
  role,
  parts,
}: {
  conversationId: string;
  userId: string;
  role: MessageRole;
  parts: MessagePart[];
}): Promise<boolean> {
  try {
    await db.conversation.update({
      where: { id: conversationId, userId },
      data: {
        updatedAt: new Date(),
        messages: {
          create: {
            role,
            parts: parts as unknown as Prisma.InputJsonValue,
            text: textFromParts(parts),
          },
        },
      },
      select: { id: true },
    });

    return true;
  } catch (error) {
    // P2025 is "record to update not found" — here that means the id is wrong
    // *or* the conversation belongs to someone else. The two are deliberately
    // indistinguishable; anything else is a real fault and should surface.
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return false;
    }

    throw error;
  }
}
