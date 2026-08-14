# Talk to an AI near you

A chat app built on Claude. Sign up, start a conversation, watch replies stream
in, come back later and your threads are still there.

Next.js (App Router) · TypeScript · Postgres via Prisma · Auth.js credentials ·
Vercel AI SDK · Tailwind + shadcn/ui

---

## Getting started

You need **Node 20.9+**, **Docker** (or any Postgres you can point at), and an
**Anthropic API key**.

```bash
# 1. Install. This also generates the Prisma client — Prisma 7 ships no
#    postinstall hook of its own, so package.json runs `prisma generate`.
npm ci

# 2. Configure. Fill in AUTH_SECRET and ANTHROPIC_API_KEY; DATABASE_URL already
#    matches the compose file.
cp .env.example .env
openssl rand -base64 32     # paste into AUTH_SECRET

# 3. Start Postgres and wait for it to accept connections.
npm run db:up

# 4. Create the schema.
npm run db:migrate

# 5. Run it.
npm run dev
```

Open <http://localhost:3000>, click **Start chatting**, and create an account.

`npm ci` rather than `npm install` on purpose: it installs strictly from
`package-lock.json` and fails if the lockfile and `package.json` disagree, which
is the guarantee you want on a fresh clone. Day-to-day work still uses
`npm install`.

### Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | Pre-filled for the bundled Postgres. Point it anywhere else and nothing else changes. |
| `AUTH_SECRET` | yes | Signs the session JWT. At least 32 characters — `openssl rand -base64 32`. |
| `ANTHROPIC_API_KEY` | yes | Server-side only. There is no `NEXT_PUBLIC_` variant and no model call originates in the browser. |
| `AUTH_URL` | only for non-Vercel production | See below. Not needed for `npm run dev` or for Vercel. |

### Running a production build

`npm run dev` needs nothing extra. A **production** build hosted anywhere other
than Vercel — including `npm run build && npm start` on your own machine — also
needs `AUTH_URL`:

```bash
AUTH_URL="http://localhost:3000" npm start
```

Auth.js will not trust the `Host` header in production unless it can verify the
origin, and without this every sign-in fails with `UntrustedHost`. Development
and Vercel each satisfy that check on their own, which is why it only bites
here. Setting `trustHost: true` in the config would remove the variable, but it
means trusting a header an attacker controls — so it is a deliberate omission.

All three are parsed with Zod at startup, so a missing or malformed value fails
immediately with a readable message rather than as a mystery 500 on the first
request.

`.env` is gitignored. `.env.example` is the only env file in the repository.

### Not using Docker?

Point `DATABASE_URL` at any Postgres — a local install, Neon, Prisma Postgres,
Supabase — and skip step 3. Nothing else in the setup changes.

---

## Scripts

| | |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and serve. `build` applies migrations first — see Deploying. |
| `npm run check:types` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:up` / `db:down` | Start / stop the bundled Postgres |
| `npm run db:migrate` | Apply migrations |
| `npm run db:studio` | Prisma Studio |

---

## Deploying

The app is a single Next.js project with no build configuration, so any Node
host works. Vercel needs no `vercel.json` — it detects the framework and runs
`npm run build`.

**Three environment variables**, and only three:

| | |
| --- | --- |
| `DATABASE_URL` | A hosted Postgres — Neon, Prisma Postgres, Supabase, RDS. |
| `AUTH_SECRET` | Generate a **fresh** one for production; don't reuse the local value. |
| `ANTHROPIC_API_KEY` | The same key type as local. |

**`AUTH_URL` is not needed on Vercel** — the platform sets `VERCEL`, which
satisfies Auth.js's host check on its own. Any *other* production host does need
it (see [Running a production build](#running-a-production-build)); it is the
single most likely thing to go wrong on a non-Vercel deploy, because everything
builds and serves fine and only sign-in fails.

### Migrations run at build time

`npm run build` is `prisma migrate deploy && next build`. `migrate deploy` is
the non-interactive form — it applies committed migrations and never generates
or prompts — and it is idempotent, so re-running it on every deploy is a no-op
once the schema is current.

This is deliberate rather than incidental. Without it the build still succeeds,
because `postinstall` generates the Prisma *client* and that is all the build
needs — and then the first request that touches a table fails at runtime against
an empty database. The failure reads like a connection problem rather than a
missing schema, which is a bad half-hour.

### If your host separates pooled and direct connections

Some providers (Neon among them) hand out a pooled connection string for the app
and a direct one for migrations. If `prisma migrate deploy` fails at build time
while the app itself connects fine, that is the distinction to check — the
provider's current Prisma guidance is the place to look, since the details move.

---

## How it is put together

Three tiers, separated by directory rather than by convention:

| Path | Tier | What |
| --- | --- | --- |
| `src/app/` | — | Routes only. Pages render a feature component; handlers do auth → validate → call a service → respond. |
| `src/server/` | backend | Prisma, env, auth config, all business logic. Every file starts with `import "server-only"`. |
| `src/features/<domain>/` | frontend | The UI half of a domain: `components/`, `hooks/`, `api/`, `schemas/`. |
| `src/shared/` | shared | Isomorphic and non-secret: the HTTP error envelope, shared types, `cn`. |

**The boundary is compiler-enforced.** `import "server-only"` at the top of every
`src/server/` module makes importing one from a client component a build error,
which is what keeps `ANTHROPIC_API_KEY` out of the browser bundle structurally
rather than by discipline.

A few rules the code actually follows, rather than aspires to:

- **Every query is scoped to the session user.** `Conversation.userId` is the
  ownership boundary, and the filter goes *into* the statement — `findFirst({
  where: { id, userId } })`, `deleteMany({ where: { id, userId } })` — never a
  lookup followed by a check. A miss returns 404 with the same body as an id
  that never existed, so the API never confirms someone else's conversation is
  real.
- **Prisma is only called from a service** in `src/server/features/<domain>/`.
- **Zod parses at every boundary**: env at boot, credentials at sign-in, request
  bodies in every handler. Forms and handlers import the same schema, so they
  cannot drift.
- **Errors go out through one envelope**, `{ error: { code, message } }`, with
  the status derived from the code. Clients branch on `code`, never on message
  text.
- **A failed model call leaves no half turn.** The user's message is committed
  before the model is called; if the call fails you get a 502 and no assistant
  message, so history stays consistent and the message you typed is not lost.

`CLAUDE.md` has the longer version, including the AI SDK surface notes that were
verified against the installed packages rather than recalled.

---

## Deliberately not included

Named here so they read as decisions rather than oversights: RBAC and activity
logging, message editing and regeneration, model switching, rich markdown
rendering, and automated tests. The write-up covers the reasoning and what would
come first with more time.
