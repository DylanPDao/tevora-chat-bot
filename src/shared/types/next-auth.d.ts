import type { User } from "@auth/core/types";

/**
 * Makes `session.user.id` a real `string`.
 *
 * Out of the box `DefaultUser.id` is optional and `DefaultSession.user` is
 * optional too, so every query scoped to the session user would need a non-null
 * assertion. Since `userId` is the ownership boundary for every conversation
 * read, that assertion would appear in every handler — this augmentation is
 * what keeps it out of all of them.
 *
 * The merge targets are `@auth/core/types` and `@auth/core/jwt`, not
 * `next-auth` / `next-auth/jwt`: those paths only re-export
 * (`export * from "@auth/core/jwt"`), so augmenting them declares a *new*
 * interface instead of merging into the one Auth.js actually uses.
 */

declare module "@auth/core/types" {
  interface Session {
    // Overriding `user` rather than re-declaring `id` on `User`: merging
    // `id: string` onto the inherited `id?: string` is a conflicting
    // declaration, but narrowing the property on the derived interface is fine.
    user: User & { id: string };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    /** Copied from `user.id` on the sign-in request; read on every later call. */
    id: string;
  }
}
