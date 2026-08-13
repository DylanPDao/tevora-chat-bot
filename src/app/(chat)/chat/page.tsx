import type { Metadata } from "next";

import { auth } from "@/server/auth";

export const metadata: Metadata = { title: "Chat" };

/**
 * Placeholder. Phase 2 replaces this with the sidebar and Phase 3 with the
 * thread — it exists now so the register → sign-in → redirect walkthrough
 * completes instead of landing on a 404.
 *
 * The `auth()` call is the real thing, not scaffolding: it proves the session
 * cookie set by the credentials provider is readable server-side. Route
 * protection itself arrives with the middleware in 1D.
 */
export default async function ChatPage(): Promise<React.ReactNode> {
  const session = await auth();

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-xl font-semibold">Signed in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {session?.user
            ? `Session belongs to ${session.user.email} (${session.user.id}).`
            : "No session — the middleware in 1D will keep you off this page."}
        </p>
      </div>
    </div>
  );
}
