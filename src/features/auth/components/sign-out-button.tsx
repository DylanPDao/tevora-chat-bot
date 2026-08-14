"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * `redirectTo` rather than a manual `router.push`: Auth.js clears the cookie
 * and performs the navigation itself, so there is no window in which the app
 * has rendered as signed-out while the cookie still exists. Middleware would
 * bounce them to /login anyway — this just avoids the flicker.
 *
 * Nothing is revoked server-side, because nothing can be: the credentials
 * provider forces JWT sessions, so signing out deletes the cookie and the token
 * itself stays valid until its 24h expiry. That bound is the whole reason
 * `maxAge` is 24 hours.
 */
export function SignOutButton(): React.ReactNode {
  const [isPending, setIsPending] = useState(false);

  return (
    <Button
      variant="outline"
      disabled={isPending}
      onClick={() => {
        setIsPending(true);
        void signOut({ redirectTo: "/login" });
      }}
    >
      {isPending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
