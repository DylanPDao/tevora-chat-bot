"use client";

import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useCallback, useState } from "react";

import { registerUser } from "@/features/auth/api/auth-api";
import type { RegisterInput } from "@/features/auth/schemas/auth-schemas";

/**
 * Sign-up is two calls, not one (decision #17): create the account, then sign
 * in. The point is that "the account wasn't created" and "the account exists
 * but the session wasn't issued" are different outcomes for the user — the
 * second must not invite a retry that would then fail with "email taken".
 */

export type UseRegisterOptions = {
  redirectTo: string;
  /**
   * Server-side field errors are pushed into the form's own error state rather
   * than kept beside it, so `FormMessage` renders them exactly like a client
   * validation failure and there is one place a field's message can come from.
   */
  setFieldError: (field: keyof RegisterInput, message: string) => void;
};

export type UseRegister = {
  submit: (input: RegisterInput) => Promise<void>;
  /** Form-level message only; field-level goes through `setFieldError`. */
  error: string | null;
  isPending: boolean;
};

const REGISTER_FIELDS = ["email", "password", "name"] as const;

function isRegisterField(field: string): field is keyof RegisterInput {
  return (REGISTER_FIELDS as readonly string[]).includes(field);
}

export function useRegister({
  redirectTo,
  setFieldError,
}: UseRegisterOptions): UseRegister {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const submit = useCallback(
    async (input: RegisterInput): Promise<void> => {
      setError(null);
      setIsPending(true);

      const created = await registerUser(input);

      if (!created.ok) {
        // Unlike sign-in, registration *should* say the email is taken — a
        // signup form that hides it is unusable, and the address is already
        // discoverable by trying to register it. The enumeration guarantee
        // applies to the login path, not here.
        if (created.code === "EMAIL_TAKEN") {
          setFieldError("email", created.message);
        } else if (created.fields) {
          for (const [field, messages] of Object.entries(created.fields)) {
            // Ignore keys we don't render — a message with nowhere to appear
            // would silently swallow the failure.
            if (isRegisterField(field) && messages[0]) {
              setFieldError(field, messages[0]);
            } else {
              setError(created.message);
            }
          }
        } else {
          setError(created.message);
        }

        setIsPending(false);
        return;
      }

      const signedIn = await signIn("credentials", {
        email: input.email,
        password: input.password,
        redirect: false,
      });

      // Same trap as use-login: a rejected credentials sign-in is an HTTP 200,
      // so `ok` is true and only `error` tells the truth.
      if (!signedIn || signedIn.error) {
        // The account is real at this point, so sending them to sign in
        // manually is the honest recovery. Retrying registration would hit
        // EMAIL_TAKEN on their own brand-new account.
        setError(
          "Your account was created, but signing in failed. Try logging in.",
        );
        setIsPending(false);
        return;
      }

      router.refresh();
      router.push(redirectTo);
    },
    [redirectTo, router, setFieldError],
  );

  return { submit, error, isPending };
}
