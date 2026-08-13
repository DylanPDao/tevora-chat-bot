"use client";

import { useRouter } from "next/navigation";
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

export type UseLogin = {
  submit: (credentials: Credentials) => Promise<void>;
  error: string | null;
  isPending: boolean;
};

export function useLogin(redirectTo: string): UseLogin {
  const router = useRouter();
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

      if (!result?.ok) {
        setError(SIGN_IN_FAILED);
        setIsPending(false);
        return;
      }

      // The session cookie is set but every Server Component still holds the
      // signed-out render. `refresh()` re-fetches them before navigating, so
      // the destination doesn't paint as a logged-out user first.
      router.refresh();
      router.push(redirectTo);
    },
    [redirectTo, router],
  );

  return { submit, error, isPending };
}
