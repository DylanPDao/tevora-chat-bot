import "server-only";

import { z } from "zod";

/**
 * Server-side environment. Parsed once, at module load, so a missing or
 * malformed variable fails immediately with a readable message instead of
 * surfacing as a mystery 500 on the first chat request.
 *
 * `server-only` makes importing this from a client component a build error —
 * the secrets below can never reach the browser bundle.
 */
const serverEnvSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required — see .env.example"),
  AUTH_SECRET: z
    .string()
    .min(32, "AUTH_SECRET must be at least 32 chars. Generate one with: openssl rand -base64 32"),
  ANTHROPIC_API_KEY: z
    .string()
    .min(1, "ANTHROPIC_API_KEY is required — get one at https://console.anthropic.com/settings/keys"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

const parsed = serverEnvSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");

  throw new Error(
    `Invalid environment configuration:\n${details}\n\nCopy .env.example to .env and fill in the missing values.`,
  );
}

export const env = parsed.data;
