import type { CreateConversationInput } from "@/features/conversations/schemas/conversation-schemas";
import type { ApiError, ErrorCode } from "@/shared/http";

/**
 * Client-side callers for the conversation endpoints — the frontend half of the
 * wire. `app/api/conversations/*` is the endpoint; this is the code that hits
 * it.
 *
 * These *throw* on failure, unlike `auth-api.ts` which returns a result object.
 * The difference is deliberate and comes from the consumer: TanStack Query
 * derives `error` and `isError` from a rejected promise, so throwing is what
 * makes `useMutation` work without translating a value back into an exception.
 * The auth forms had no Query involved and wanted the value.
 */

/**
 * The wire shape, which is *not* the service's `ConversationSummary`: JSON has
 * no Date, so `updatedAt` arrives as an ISO string. Declaring it separately
 * keeps that difference visible instead of letting a `Date`-typed field lie.
 */
export type Conversation = {
  id: string;
  title: string;
  updatedAt: string;
};

/** Carries the envelope's `code` so callers branch on the contract, not text. */
export class ConversationsApiError extends Error {
  constructor(
    readonly code: ErrorCode | "UNEXPECTED",
    message: string,
  ) {
    super(message);
    this.name = "ConversationsApiError";
  }
}

function isApiError(body: unknown): body is ApiError {
  return (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof (body as ApiError).error?.code === "string"
  );
}

/**
 * Turns any non-2xx into a typed throw. `UNEXPECTED` marks a response that
 * never reached a handler — a proxy error page, a network failure — so it is
 * never confused with a verdict the server actually returned.
 */
async function failure(response: Response): Promise<never> {
  const body: unknown = await response.json().catch(() => null);

  if (isApiError(body)) {
    throw new ConversationsApiError(body.error.code, body.error.message);
  }

  throw new ConversationsApiError(
    "UNEXPECTED",
    "Something went wrong. Please try again.",
  );
}

export async function fetchConversations(): Promise<Conversation[]> {
  const response = await fetch("/api/conversations");

  if (!response.ok) {
    return failure(response);
  }

  return response.json() as Promise<Conversation[]>;
}

export async function createConversation(
  input: CreateConversationInput = {},
): Promise<Conversation> {
  const response = await fetch("/api/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // Always a body, even when empty — the handler requires JSON rather than
    // special-casing an absent request.
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    return failure(response);
  }

  return response.json() as Promise<Conversation>;
}

export async function deleteConversation(id: string): Promise<void> {
  const response = await fetch(`/api/conversations/${id}`, {
    method: "DELETE",
  });

  // 204, so there is no body to read — and nothing worth returning, since the
  // caller already knows the id it sent.
  if (!response.ok) {
    await failure(response);
  }
}
