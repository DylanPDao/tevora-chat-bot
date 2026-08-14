"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import {
  fetchConversations,
  type Conversation,
} from "@/features/conversations/api/conversations-api";

/**
 * The sidebar list, and the one thing TanStack Query owns in this app.
 *
 * The boundary that matters: Query never touches thread messages — `useChat`
 * owns those, and mirroring them here would create two sources of truth that
 * fight mid-stream. They meet at exactly one seam, where `useChat`'s `onFinish`
 * invalidates the key below so a new thread appears in the sidebar.
 */

/** Exported because both mutations invalidate it. One key, one place. */
export const conversationsQueryKey = ["conversations"] as const;

export function useConversations(): UseQueryResult<
  Conversation[],
  Error
> {
  return useQuery({
    queryKey: conversationsQueryKey,
    queryFn: fetchConversations,
  });
}
