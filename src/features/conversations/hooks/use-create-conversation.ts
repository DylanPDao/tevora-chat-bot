"use client";

import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import {
  createConversation,
  type Conversation,
} from "@/features/conversations/api/conversations-api";
import { conversationsQueryKey } from "@/features/conversations/hooks/use-conversations";
import type { CreateConversationInput } from "@/features/conversations/schemas/conversation-schemas";

/**
 * This is where `useMutation` earns its place, unlike in the auth hooks: there
 * is a cache to invalidate. `isPending` and `error` are incidental — the reason
 * to reach for Query here is that a successful create makes the sidebar list
 * stale, and `onSuccess` is the one place that fact belongs.
 *
 * No optimistic insert. Decision #13 defers it, and the honest reason is that
 * the id is server-generated: an optimistic row needs a temporary id, then a
 * reconciliation when the real one arrives, and the caller navigates to that id
 * immediately. Not worth the failure modes at this size.
 */
export function useCreateConversation(): UseMutationResult<
  Conversation,
  Error,
  CreateConversationInput | undefined
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input?: CreateConversationInput) => createConversation(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: conversationsQueryKey });
    },
  });
}
