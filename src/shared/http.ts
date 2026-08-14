import type { ZodError } from "zod";
import { flattenError } from "zod";

/**
 * The one HTTP error envelope. Every route handler reports failure through
 * these helpers, so the shape is identical across the API and a client can
 * branch on `code` instead of pattern-matching message text.
 *
 * Isomorphic on purpose: handlers construct the responses, forms import
 * `ErrorCode` and `ApiError` to decide what to render. Nothing secret here, so
 * no `server-only`.
 */

/**
 * Codes are the contract; the status is derived from them so a handler can
 * never pair `EMAIL_TAKEN` with a 200.
 */
export const ERROR_STATUS = {
  /** Body failed Zod validation. `fields` carries the per-field messages. */
  VALIDATION_FAILED: 400,
  /** No session, or the session is no longer valid. */
  UNAUTHENTICATED: 401,
  /**
   * The row does not exist *or* belongs to another user — deliberately the same
   * response, so the API never confirms that someone else's conversation id is
   * real.
   */
  NOT_FOUND: 404,
  /** Registration hit the unique constraint on `User.email`. */
  EMAIL_TAKEN: 409,
  /** The model call failed. Nothing partial is persisted; the user can retry. */
  MODEL_UNAVAILABLE: 502,
} as const satisfies Record<string, number>;

export type ErrorCode = keyof typeof ERROR_STATUS;

export type ApiError = {
  error: {
    code: ErrorCode;
    message: string;
    /** Per-field validation messages, keyed by field name. 400 only. */
    fields?: Record<string, string[]>;
  };
};

function apiError(
  code: ErrorCode,
  message: string,
  fields?: Record<string, string[]>,
): Response {
  const body: ApiError = { error: { code, message, ...(fields && { fields }) } };

  return Response.json(body, { status: ERROR_STATUS[code] });
}

/**
 * Zod's issues become `fields` so a form can attach each message to its input.
 * Passing the error through unmodified would leak the parsed shape back to the
 * client, which is more than it needs.
 */
export function validationFailed(error: ZodError): Response {
  const { fieldErrors, formErrors } = flattenError(error);
  const fields = fieldErrors as Record<string, string[]>;

  return apiError(
    "VALIDATION_FAILED",
    formErrors[0] ?? "Some fields need fixing.",
    // A whole-body failure (unparseable JSON, wrong type) has no per-field
    // messages; omit the key rather than sending an empty object.
    Object.keys(fields).length > 0 ? fields : undefined,
  );
}

/**
 * A validation failure that did not come from a Zod parse — for shapes a schema
 * deliberately delegates to another validator, like the AI SDK checking its own
 * `UIMessage` type. Same code and status as `validationFailed`, so clients
 * branch identically; it just has no per-field detail to attach.
 */
export function invalidRequest(message: string): Response {
  return apiError("VALIDATION_FAILED", message);
}

export function unauthenticated(): Response {
  return apiError("UNAUTHENTICATED", "You need to be signed in.");
}

/** Use for not-found *and* not-owned. The message must not distinguish them. */
export function notFound(): Response {
  return apiError("NOT_FOUND", "Not found.");
}

export function emailTaken(): Response {
  return apiError("EMAIL_TAKEN", "That email is already registered.");
}

export function modelUnavailable(): Response {
  return apiError(
    "MODEL_UNAVAILABLE",
    "The assistant is unavailable right now. Your message was saved — try again.",
  );
}
