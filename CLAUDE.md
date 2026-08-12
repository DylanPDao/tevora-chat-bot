# CLAUDE.md

Conventions for this repo. It is a take-home build scoped to roughly four hours —
the brief says explicitly not to gold-plate. Sections marked *(planned)* describe
code that does not exist yet — tighten them to verified facts as the code lands.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js (App Router), React, TypeScript |
| Data | Prisma + PostgreSQL |
| Auth | Auth.js v5, credentials provider, JWT sessions |
| Model | Anthropic via Vercel AI SDK (`ai` + `@ai-sdk/anthropic`), streaming |
| UI | Tailwind + shadcn/ui |
| Client state | TanStack Query — **conversation list only** |
| Validation | Zod |
| Package manager | npm |

## Layout

Backend and frontend are separated by directory, not just by convention.

| Path | What |
| --- | --- |
| `src/app/` | **Routes only, kept thin.** Route groups `(auth)` and `(chat)`; handlers under `app/api/`. |
| `src/server/` | **Backend.** Prisma, env, auth config, all business logic. |
| `src/server/features/<domain>/` | One folder per domain — `auth`, `conversations`, `messages` — each holding its service, schemas, and types. |
| `src/components/` | **Frontend.** `ui/` is shadcn (don't hand-edit); `auth/`, `chat/`, `layout/` are ours. |
| `src/hooks/` | Client hooks. |
| `src/lib/` | Isomorphic helpers and schemas — safe on both sides. Nothing secret. |
| `src/types/` | Shared type declarations. |

**The boundary is compiler-enforced.** Every module under `src/server/` starts
with `import "server-only"`, so importing one from a client component fails the
build rather than relying on someone catching it in review. That is what keeps
`ANTHROPIC_API_KEY` out of the browser bundle structurally instead of by
discipline.

Route handlers stay thin: auth → validate → call a service → respond. If a
handler is touching Prisma directly, the logic is in the wrong layer.

## The rules that actually matter

**Secrets never reach the client.** `ANTHROPIC_API_KEY` is read only in route
handlers and server modules. There is no `NEXT_PUBLIC_` variant of any secret,
and no model call originates from the browser. `.env` is gitignored from the
first commit; `.env.example` is the only env file ever committed.

**Every query is scoped to the session user.** `Conversation.userId` is the
ownership boundary. A handler never trusts a client-supplied `conversationId`
alone — it loads the conversation filtered by both the id *and*
`session.user.id`, and 404s on a miss. A user POSTing someone else's
conversation id must not get a 200.

**Prisma is only called from `lib/services/`.** Route handlers do auth →
validate → call a service → respond. This mirrors the "unified service layer"
convention the role description names; it also keeps the ownership check above
in one auditable place instead of scattered across handlers.

**Zod parses at every boundary.** Env at boot, credentials at sign-in, request
bodies in every handler. Client forms and server handlers import the same schema
so they cannot drift.

**`useChat` and TanStack Query do not overlap.** `useChat` owns the active
thread — messages, streaming, input, submit. TanStack Query owns the
conversation sidebar — list, create, delete. They meet only in `onFinish`, which
invalidates the conversations query. Never mirror thread messages into Query;
two sources of truth mid-stream is the bug that follows.

**On model-call failure, don't leave half a turn in the DB.** Persist the user
message, then call the model. If the call fails, return 502 and persist no
assistant message. History stays consistent and the user can retry.

## Model notes

Use `claude-opus-5` (the current Opus; `claude-fable-5` is the tier above).
Two behaviors to respect:

- **Thinking is on by default**, and `max_tokens` caps thinking *plus* response
  text — a tight `maxTokens` truncates answers mid-sentence with no obvious
  cause. Leave real headroom.
- **`stop_reason: "refusal"`** is a successful HTTP 200 with empty or partial
  content. Check it before reading content.

Both sit under the AI SDK's abstraction, so verify how that layer surfaces them
rather than assuming.

## AI SDK surface (verified against installed `ai@7`, `@ai-sdk/react@4`)

Checked in `node_modules`, not recalled — most published examples are for v3/v4
and are wrong here.

- **`useChat` lives in `@ai-sdk/react`**, not `ai`.
- It returns `{ messages, sendMessage, status, error, setMessages, regenerate,
  stop, clearError, id, ... }`. There is **no `input`, `handleInputChange`,
  `handleSubmit`, or `isLoading`** — input is our own state, and `status`
  replaces `isLoading`.
- Options are `{ id, messages, transport, onFinish, onError, onData, ... }`.
  `messages` seeds server-loaded history; `onFinish` is the one seam where the
  conversations query gets invalidated.
- HTTP to a route handler goes through `DefaultChatTransport` from `ai`.

Before using any other AI SDK export, read its type in
`node_modules/ai/dist/index.d.ts` first.

## Working rules

- Feature branches only; never commit to `main` directly.
- Explicit TypeScript types. No `any`.
- Component `.tsx` files stay under 150 LOC — extract sub-components and hooks.
- Comments only where the logic isn't self-evident. No `console.log` left behind.
- Don't run `next build` during dev; use `tsc --noEmit` and eslint for feedback.

## Deliverables

Three, all required by the brief:

1. Public GitHub repo with a README covering setup, env vars, and local run.
2. A working app that boots from a clean clone by following that README.
3. A one-to-two-page write-up: how AI tooling was used, what was delegated vs
   hand-written, decisions and trade-offs, what would come next.
