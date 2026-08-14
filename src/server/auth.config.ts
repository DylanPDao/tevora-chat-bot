import type { NextAuthConfig } from "next-auth";

/**
 * The half of the Auth.js config that can run anywhere — no Prisma, no bcrypt,
 * no secrets read at module scope. `middleware.ts` builds a client from this
 * alone so the Edge bundle stays free of the database driver; `auth.ts` spreads
 * it and adds the credentials provider for the Node side.
 *
 * Deliberately no `import "server-only"`, unlike every other module under
 * `src/server/`. That guard exists to keep server code out of the *client*
 * bundle, but middleware is a third runtime that is neither, and the package
 * throws there. The rule still holds for `auth.ts`, which is what actually
 * touches the database.
 *
 * `secret` is also deliberately absent — Auth.js falls back to
 * `process.env.AUTH_SECRET` itself (`next-auth/src/lib/env.ts`), so this file
 * never has to import `@/server/env` and drag the whole Zod schema, including
 * `ANTHROPIC_API_KEY`, into middleware. `auth.ts` still passes it explicitly,
 * so a missing secret fails loudly at boot on the Node side.
 */

/**
 * 24 hours. The credentials provider refuses database sessions, so a JWT cannot
 * be revoked server-side before it expires — this value *is* the revocation
 * window, not just a convenience setting.
 */
const SESSION_MAX_AGE_SECONDS = 24 * 60 * 60;

export const authConfig = {
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE_SECONDS },

  // Unauthenticated requests land on our page, not Auth.js's built-in one.
  pages: { signIn: "/login" },

  // Empty on purpose. `authorize()` reaches Prisma and bcrypt and cannot run on
  // the Edge — and middleware never calls it, since verifying a JWT only needs
  // the secret and the callbacks below. `auth.ts` supplies the real provider.
  providers: [],

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
} satisfies NextAuthConfig;
