import { registerSchema } from "@/features/auth/schemas/auth-schemas";
import { createUser } from "@/server/features/auth/services/user-service";
import { emailTaken, validationFailed } from "@/shared/http";

/**
 * Creates the account and stops there — the client calls `signIn` itself. Two
 * steps keeps "the account couldn't be created" and "the account exists but
 * sign-in failed" on separate error paths, which one 201 cannot express.
 */
export async function POST(request: Request): Promise<Response> {
  // A malformed body is a validation failure, not a 500, so the throw from
  // json() is folded into the same path as a bad field.
  const body: unknown = await request.json().catch(() => null);

  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return validationFailed(parsed.error);
  }

  const result = await createUser(parsed.data);

  if (!result.ok) {
    return emailTaken();
  }

  return Response.json(result.user, { status: 201 });
}
