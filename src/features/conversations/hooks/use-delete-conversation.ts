"use client";

import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import { deleteConversation } from "@/features/conversations/api/conversations-api";
import { conversationsQueryKey } from "@/features/conversations/hooks/use-conversations";

/**
 * A 404 here is not only "already gone" — the API returns the same 404 for a
 * conversation belonging to someone else, deliberately, so the two are
 * indistinguishable to this hook. Either way the right response is the same:
 * refetch and let the list tell the truth. That is why `onSettled` invalidates
 * rather than `onSuccess` — a failed delete should still reconcile the sidebar,
 * since the row may be missing for a reason the client cannot see.
 */
export function useDeleteConversation(): UseMutationResult<
  void,
  Error,
  string
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteConversation(id),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: conversationsQueryKey });
    },
  });
}
