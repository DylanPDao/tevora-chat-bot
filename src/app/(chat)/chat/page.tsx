import type { Metadata } from "next";

import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { auth } from "@/server/auth";

export const metadata: Metadata = { title: "Chat" };

/**
 * Placeholder. Phase 2 replaces this with the sidebar and Phase 3 with the
 * thread.
 *
 * The `auth()` call is the real thing, not scaffolding: middleware has already
 * verified the JWT before this renders, but reading it here proves the session
 * is available to a Server Component — which is how every Phase 2 query will
 * get the `userId` it scopes by.
 */
export default async function ChatPage(): Promise<React.ReactNode> {
  const session = await auth();

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-xl font-semibold">Signed in</h1>
        <p className="text-sm text-muted-foreground">
          Session belongs to {session?.user.email} ({session?.user.id}).
        </p>
        <SignOutButton />
      </div>
    </div>
  );
}
