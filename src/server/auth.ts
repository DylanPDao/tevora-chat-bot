import "server-only";

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { credentialsSchema } from "@/features/auth/schemas/auth-schemas";
import { authConfig } from "@/server/auth.config";
import { env } from "@/server/env";
import { verifyCredentials } from "@/server/features/auth/services/user-service";

/**
 * The Node-side Auth.js client. `auth()` is the session read used by every
 * protected handler; `handlers` backs `app/api/auth/[...nextauth]`.
 *
 * Session settings and callbacks live in `auth.config.ts` because middleware
 * needs them too — spread rather than copied, so the two runtimes cannot drift
 * apart. Everything added here is the part that only works on Node.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,

  // Passed explicitly so a missing value fails through our Zod env check at
  // boot with a readable message, rather than surfacing later as an Auth.js
  // error on the first sign-in attempt.
  secret: env.AUTH_SECRET,

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
});
