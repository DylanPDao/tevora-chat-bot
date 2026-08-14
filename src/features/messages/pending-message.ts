/**
 * Hands the first message from `/chat` to the thread page it navigates to.
 *
 * Decision #13 creates the conversation explicitly, before streaming, so the
 * user's opening message exists in the browser for the moment between "the
 * server assigned an id" and "the thread is mounted and can send it". Something
 * has to carry it across that navigation.
 *
 * A module-scoped map rather than the URL: the message is the user's own text,
 * and a query string would put it in browser history, in the referrer of every
 * subsequent request, and in any server access log. Rather than sessionStorage,
 * because this genuinely should not outlive the navigation — a stale entry
 * replayed into a later visit would send a message the user did not just type.
 *
 * The trade-off is that it does not survive a hard reload mid-navigation. That
 * leaves a conversation titled after a message it does not contain, which is
 * recoverable by retyping; the alternative failure modes are worse.
 */
const pending = new Map<string, string>();

export function setPendingMessage(conversationId: string, text: string): void {
  pending.set(conversationId, text);
}

/** Reads and clears in one step, so it can only ever be sent once. */
export function takePendingMessage(conversationId: string): string | undefined {
  const text = pending.get(conversationId);
  pending.delete(conversationId);

  return text;
}
