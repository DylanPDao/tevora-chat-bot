// Prisma 7 does NOT read .env automatically the way Prisma 6 did — without this
// import, every CLI command fails with "Cannot resolve environment variable:
// DATABASE_URL" even though .env is present. Next.js loads .env for the app
// itself; this covers the CLI (migrate, studio, db push).
//
// dotenv rather than Node's built-in process.loadEnvFile() so the CLI works on
// any Node 20+, not just 20.12+. In deployed environments (Vercel) there is no
// .env file and dotenv simply no-ops, leaving the platform's vars intact.
import "dotenv/config";

import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
