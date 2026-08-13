import type { RegisterInput } from "@/features/auth/schemas/auth-schemas";
import type { ApiError, ErrorCode } from "@/shared/http";

/**
 * Client-side callers for the auth endpoints. This is the *frontend* half of
 * the wire — `app/api/register/route.ts` is the endpoint, this is the code that
 * hits it.
 *
 * Sign-in is deliberately absent: Auth.js owns `/api/auth/*` and its own client
 * `signIn()` posts there, so wrapping it would add a layer over a call we don't
 * control.
 */

export type RegisteredUser = {
  id: string;
  email: string;
  name: string | null;
};

/**
 * Failure carries the envelope's `code` so callers branch on the contract
 * rather than on message text, plus `fields` so a form can attach messages to
 * the inputs that produced them.
 */
export type RegisterFailure = {
  ok: false;
  /**
   * `UNEXPECTED` is not an envelope code — it's the client's own marker for a
   * response that never reached a handler (network down, a proxy error page).
   * Kept distinct so a form can't confuse it with a real server verdict.
   */
  code: ErrorCode | "UNEXPECTED";
  message: string;
  fields?: Record<string, string[]>;
};

export type RegisterResult = { ok: true; user: RegisteredUser } | RegisterFailure;

const UNEXPECTED: RegisterFailure = {
  ok: false,
  code: "UNEXPECTED",
  message: "Something went wrong. Please try again.",
};

export async function registerUser(
  input: RegisterInput,
): Promise<RegisterResult> {
  let response: Response;

  try {
    response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    // Offline, DNS failure, request aborted — never a parseable envelope.
    return UNEXPECTED;
  }

  const body: unknown = await response.json().catch(() => null);

  if (response.ok) {
    return { ok: true, user: body as RegisteredUser };
  }

  if (!isApiError(body)) {
    return UNEXPECTED;
  }

  return {
    ok: false,
    code: body.error.code,
    message: body.error.message,
    fields: body.error.fields,
  };
}

function isApiError(body: unknown): body is ApiError {
  return (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof (body as ApiError).error?.code === "string"
  );
}
