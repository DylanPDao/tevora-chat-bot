// Prisma 7 does NOT read .env automatically the way Prisma 6 did — without this
// import, every CLI command fails with "Cannot resolve environment variable:
// DATABASE_URL" even though .env is present. Next.js loads .env for the app
// itself; this covers the CLI (migrate, studio, db push).
//
// dotenv rather than Node's built-in process.loadEnvFile() so the CLI works on
// any Node 20+, not just 20.12+. In deployed environments (Vercel) there is no
// .env file and dotenv simply no-ops, leaving the platform's vars intact.
import "dotenv/config";

import { defineConfig } from "prisma/config";

/**
 * The datasource is attached only when DATABASE_URL is actually set.
 *
 * Prisma's `env()` helper resolves eagerly at config load and throws when the
 * variable is missing, which makes *every* CLI command fail — including
 * `generate`, which never opens a connection. That breaks a clean clone at the
 * first step: `npm ci` runs `prisma generate` through the postinstall hook,
 * before the reader has had any chance to create a .env.
 *
 * Omitting the block instead lets `generate` succeed with no database
 * configured, while `migrate` and `studio` — which genuinely need one — still
 * fail, with Prisma's own missing-datasource message rather than a confusing
 * connection error against a placeholder URL.
 */
const databaseUrl = process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  ...(databaseUrl ? { datasource: { url: databaseUrl } } : {}),
});
