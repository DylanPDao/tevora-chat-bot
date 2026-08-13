import { z } from "zod";

/**
 * The auth contracts. Imported by the forms *and* by the route handlers, so a
 * rule can never be enforced on one side and not the other. No `server-only`
 * here on purpose — that import would make a login form fail to build.
 */

/**
 * Length only — no upper/lower/digit/symbol rules, per NIST SP 800-63B and
 * OWASP. Composition rules measurably push people toward `Password1!`; a
 * breach-list check is what should be added here, not more character classes.
 * 12 sits above the 8-character floor those documents set, in the direction
 * they point.
 */
export const PASSWORD_MIN = 12;

/**
 * bcrypt hashes only the first 72 bytes and silently ignores the rest, so a
 * longer passphrase would authenticate on its first 72 characters with nothing
 * to indicate it. Rejecting is honest; truncating isn't.
 */
export const PASSWORD_MAX = 72;

/**
 * Trim and lowercase *before* the format check — `z.email()` runs its pattern
 * first, so a pasted "  Alice@Example.com  " would otherwise be rejected as
 * malformed. Normalizing here is also what makes `User.email @unique` real:
 * Alice@x.com and alice@x.com must not become two accounts.
 */
const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address."));

export const credentialsSchema = z.object({
  email,
  // Presence only. The minimum below may have changed since the account was
  // made, and an existing user must still be able to sign in.
  password: z.string().min(1, "Enter your password."),
});

export const registerSchema = z.object({
  email,
  password: z
    .string()
    .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters.`)
    .max(PASSWORD_MAX, `Use at most ${PASSWORD_MAX} characters.`),
  name: z.string().trim().min(1).max(80).optional(),
});

export type Credentials = z.infer<typeof credentialsSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
