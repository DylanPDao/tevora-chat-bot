"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useCallback, useState } from "react";

import type { Credentials } from "@/features/auth/schemas/auth-schemas";

/**
 * The single message every sign-in failure renders.
 *
 * `authorize()` returns `null` for a bad password *and* for an email that was
 * never registered, so this hook genuinely cannot tell them apart — and that is
 * the design. A more helpful message here would turn the login form into an
 * account-enumeration oracle, undoing the constant-time compare in
 * `verifyCredentials`. Do not branch on `result.code`.
 */
const SIGN_IN_FAILED = "That email or password isn't right.";

const DEFAULT_DESTINATION = "/chat";

/**
 * `?from=` arrives from middleware and is therefore attacker-controllable — a
 * crafted link is enough. Anything that could leave this origin is discarded
 * rather than sanitized, since a login form that redirects offsite after a
 * successful sign-in is a credible phishing hop.
 *
 * A leading `/` is not sufficient on its own: `//evil.com` is protocol-relative
 * and `/\evil.com` is treated as protocol-relative by some browsers.
 */
function safeRedirectTarget(from: string | null): string {
  if (!from || !from.startsWith("/")) {
    return DEFAULT_DESTINATION;
  }

  if (from.startsWith("//") || from.startsWith("/\\")) {
    return DEFAULT_DESTINATION;
  }

  return from;
}

export type UseLogin = {
  submit: (credentials: Credentials) => Promise<void>;
  error: string | null;
  isPending: boolean;
};

export function useLogin(): UseLogin {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const submit = useCallback(
    async (credentials: Credentials): Promise<void> => {
      setError(null);
      setIsPending(true);

      // `redirect: false` so a failure lands back here as a value instead of a
      // full-page bounce to Auth.js's own error screen.
      const result = await signIn("credentials", {
        ...credentials,
        redirect: false,
      });

      // Branch on `error`, never on `ok`. A rejected credentials sign-in is a
      // successful HTTP 200 whose body carries the failure in a URL — so
      // `ok`, which is just `res.ok`, is `true` for a wrong password. Checking
      // it instead sends a failed login down the success path: no message, and
      // `isPending` left true on purpose for a redirect that then bounces
      // straight back here. The button says "Signing in…" forever.
      if (!result || result.error) {
        setError(SIGN_IN_FAILED);
        setIsPending(false);
        return;
      }

      // The session cookie is set but every Server Component still holds the
      // signed-out render. `refresh()` re-fetches them before navigating, so
      // the destination doesn't paint as a logged-out user first.
      router.refresh();
      router.push(safeRedirectTarget(searchParams.get("from")));
    },
    [router, searchParams],
  );

  return { submit, error, isPending };
}
