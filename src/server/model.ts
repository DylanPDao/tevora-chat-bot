import "server-only";

import { createAnthropic } from "@ai-sdk/anthropic";

import { env } from "@/server/env";

/**
 * The model client, created once.
 *
 * The key is passed explicitly rather than left to the provider's
 * `ANTHROPIC_API_KEY` fallback, so a missing key fails through our Zod env check
 * at boot with a readable message instead of surfacing as a 401 from Anthropic
 * on the first chat request. Same reasoning as `auth.ts` and `AUTH_SECRET`.
 *
 * `server-only` is what keeps the key out of the browser bundle structurally
 * rather than by discipline — this is the module that would leak it.
 */
const anthropic = createAnthropic({ apiKey: env.ANTHROPIC_API_KEY });

/** See CLAUDE.md — `claude-fable-5` is the tier above, and not needed here. */
export const chatModel = anthropic("claude-opus-5");

/**
 * Generous on purpose. Thinking is on by default and this cap covers thinking
 * *plus* response text, so a tight value truncates answers mid-sentence with no
 * obvious cause. Note the option is `maxOutputTokens` — `maxTokens` is not an
 * option in ai@7 and is silently ignored, which would make this comment a lie.
 *
 * Billing is on tokens actually produced, not on the cap, so headroom is free.
 */
export const CHAT_MAX_OUTPUT_TOKENS = 8192;
