import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { env } from "./env";

/**
 * Prisma 7 connects through a driver adapter rather than a connection string in
 * schema.prisma. The adapter owns the pg connection pool.
 */
function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

  return new PrismaClient({
    adapter,
    // `passwordHash` is dropped from every result unless a query asks for it
    // by name. Until now nothing returned it only because `user-service.ts`
    // selects explicitly everywhere — true today, but a convention rather than
    // a guarantee. This makes a careless `db.user.findUnique({ where })` in a
    // later phase incapable of leaking the hash.
    //
    // `verifyCredentials` is unaffected: an explicit `select` still wins, and
    // `omit: { passwordHash: false }` is the deliberate opt-out.
    omit: { user: { passwordHash: true } },
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

// Next.js dev-mode hot reload re-evaluates modules on every change; without a
// global cache that opens a new connection pool each time until Postgres starts
// refusing connections.
const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
