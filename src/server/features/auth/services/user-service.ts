import "server-only";

import { Prisma } from "@prisma/client";
import { compare, hash } from "bcryptjs";

import type {
  Credentials,
  RegisterInput,
} from "@/features/auth/schemas/auth-schemas";
import { db } from "@/server/db";

/**
 * The only module that touches `db.user`. Route handlers and the Auth.js
 * credentials provider both come through here, so the password rules below live
 * in one auditable place.
 */

const BCRYPT_COST = 12;

/**
 * A real bcrypt hash of a random string nobody holds. `verifyCredentials`
 * compares against it when no user matches, so an unknown email costs the same
 * ~250ms as a wrong password. Skipping the compare would make unknown-email
 * measurably faster — a timing oracle that undoes the identical error message.
 */
const ABSENT_USER_HASH =
  "$2b$12$MV1o4ymTzb0Iukmy6xKgDO6I6fzv/B/NS2HVjH7cH9d3uUnnU8Ub.";

/** Never carries `passwordHash`. Safe to return from a handler or put in a JWT. */
export type PublicUser = {
  id: string;
  email: string;
  name: string | null;
};

export type CreateUserResult =
  | { ok: true; user: PublicUser }
  | { ok: false; reason: "EMAIL_TAKEN" };

/**
 * Email arrives already trimmed and lowercased by `registerSchema` — that
 * normalization is what makes `User.email @unique` meaningful.
 */
export async function createUser({
  email,
  password,
  name,
}: RegisterInput): Promise<CreateUserResult> {
  const passwordHash = await hash(password, BCRYPT_COST);

  try {
    const user = await db.user.create({
      data: { email, passwordHash, name },
      select: { id: true, email: true, name: true },
    });

    return { ok: true, user };
  } catch (error) {
    // Let the unique constraint decide rather than checking first: a
    // findUnique-then-create pair can interleave with a concurrent signup for
    // the same address and both branches would think the email was free.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: false, reason: "EMAIL_TAKEN" };
    }

    throw error;
  }
}

/**
 * Returns `null` for both "no such user" and "wrong password" — the caller has
 * no way to tell them apart, and must not surface different messages for them.
 * That is what keeps the sign-in form from confirming which emails are
 * registered.
 */
export async function verifyCredentials({
  email,
  password,
}: Credentials): Promise<PublicUser | null> {
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, passwordHash: true },
  });

  const matches = await compare(password, user?.passwordHash ?? ABSENT_USER_HASH);

  if (!user || !matches) {
    return null;
  }

  return { id: user.id, email: user.email, name: user.name };
}
