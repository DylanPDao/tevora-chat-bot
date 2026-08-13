"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { useState, type ReactNode } from "react";

/**
 * The two client-side providers, mounted once in the root layout.
 *
 * `SessionProvider` so any client component reaches the user through
 * `useSession()` without prop-drilling through the chat shell.
 * `QueryClientProvider` for the conversation sidebar only — it never touches
 * thread messages, which `useChat` owns.
 */
export function Providers({ children }: { children: ReactNode }): ReactNode {
  // Created in state, not at module scope: a module-level client is shared
  // across every request on the server, so one user's cached conversations
  // could be served to the next.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // The sidebar is invalidated explicitly from useChat's onFinish,
            // so background refetching would only duplicate work.
            refetchOnWindowFocus: false,
            staleTime: 30_000,
          },
        },
      }),
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </SessionProvider>
  );
}
