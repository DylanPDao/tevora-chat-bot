import "server-only";

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { credentialsSchema } from "@/features/auth/schemas/auth-schemas";
import { env } from "@/server/env";
import { verifyCredentials } from "@/server/features/auth/services/user-service";

/**
 * Auth.js configuration. `auth()` is the session read used by every protected
 * route and handler; `handlers` backs `app/api/auth/[...nextauth]`.
 */

/**
 * 24 hours. The credentials provider refuses database sessions, so a JWT cannot
 * be revoked server-side before it expires — this value *is* the revocation
 * window, not just a convenience setting. Auth.js defaults to 30 days, which
 * would leave a stolen token valid for a month.
 */
const SESSION_MAX_AGE_SECONDS = 24 * 60 * 60;

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Passed explicitly so a missing value fails through our Zod env check at
  // boot with a readable message, rather than surfacing later as an Auth.js
  // error on the first sign-in attempt.
  secret: env.AUTH_SECRET,

  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE_SECONDS },

  // Unauthenticated requests land on our page, not Auth.js's built-in one.
  pages: { signIn: "/login" },

  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      /**
       * Returning `null` is the only failure signal available here, and Auth.js
       * turns it into a generic `CredentialsSignin` error carrying no detail.
       * That is deliberate and load-bearing: it is the last link in the chain
       * that keeps sign-in from confirming which emails are registered. The
       * form must render one message for every failure.
       */
      authorize: async (raw) => {
        const parsed = credentialsSchema.safeParse(raw);

        if (!parsed.success) {
          return null;
        }

        return verifyCredentials(parsed.data);
      },
    }),
  ],

  callbacks: {
    // `user` is present only on the sign-in request; every later call has just
    // the token. So the id is copied in once here and read from the token
    // thereafter.
    jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
      }

      return token;
    },

    session({ session, token }) {
      session.user.id = token.id;

      return session;
    },
  },
});
