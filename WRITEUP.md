# Write-up

## How I used AI tooling

I built this with Claude Code, and the honest summary is that I used it as a
**pair with a very good memory and no judgement about what matters**. It wrote
most of the lines. I decided what the lines should guarantee.

### The prompting approach that actually worked

Three habits did most of the work.

**Discuss before writing.** Every phase started as a conversation — what it
covers, where it could go wrong, which decisions are genuinely mine. That
surfaces things a "build me a chat app" prompt buries.

The clearest payoff was the cheapest-looking task in the project. Adding a
landing page is a one-file change; talking it through first surfaced that the
app matched public routes with `startsWith`, so adding `"/"` to that list would
have matched **every path in the app** and silently switched route protection
off. Login would still work, sign-out would still work, and every conversation
would have been readable without a session. It cost thirty seconds to say out
loud, and it is exactly the kind of thing that survives review — the diff is one
string in an array.

The same habit did quieter work elsewhere. Asking "what are our options" for
scoping messages, rather than "build it", turned up Prisma's extended
where-unique — which let the ownership filter live *inside* the write rather
than in a check wrapped around it, so there is no unscoped path a later caller
could take by accident. And it caught two of my own written-down decisions
contradicting each other: conversations were to be created before streaming
*and* titled from the first user message, which is impossible if creation
happens first. The fix — create the conversation carrying its opening message —
is what the code does now.

**Make it verify against the installed packages, not its memory.** I put a rule
in `CLAUDE.md` — read the type in `node_modules` before using an AI SDK export —
because the published examples for `ai@7` are mostly written for v3/v4 and are
wrong. This paid for itself repeatedly. `useChat` has no `input` or `isLoading`
in v7. `toUIMessageStreamResponse` is deprecated. And **`maxTokens` is not an
option at all** — it's `maxOutputTokens`, so the old name is silently ignored.
That last one is the dangerous kind of wrong: the code looks like it caps output,
and doesn't.

**Ask for the verification, not just the feature.** "Build the delete endpoint"
gets you a delete endpoint. "Prove user B can't delete user A's conversation"
gets you a delete endpoint plus two real accounts and a byte-comparison of the
404 bodies. Almost every claim in the commit log has a check behind it, and the
checks found things reading never would.

### What I delegated, and what I didn't

**Delegated:** nearly all implementation, and the entirety of the "what is this
library actually called" work — reading type definitions, checking registry
contents, tracing which env var a config helper resolves. That research is
tedious, mechanical, and exactly where a tool with a terminal beats me.

**Kept:** every decision with a trade-off in it. Session length. Password rules.
Whether to build the title-upgrade model call. Whether the sidebar needed
optimistic updates. Whether an extra abstraction earned its keep. I also kept
the naming and structure arguments — several times I pushed back on a layout the
tool proposed, and once it pushed back on me with a better reason than I had.

I kept a running decisions log as I went, one entry per choice, written at the
time rather than reconstructed afterwards. It's why this document could be
written from notes instead of memory.

### Where it helped most

Finding the bugs I wouldn't have looked for.

- The **clean clone was broken** and I only learned that by having it actually
  clone the repo into a temp directory and follow the README. `npm ci` runs
  `prisma generate` via a postinstall hook; `prisma.config.ts` resolved
  `DATABASE_URL` eagerly; the variable doesn't exist yet at that point. The very
  hook I'd added to make a clean clone work was breaking it.
- A **production build couldn't sign anyone in**. Auth.js won't trust the `Host`
  header in production unless it can verify the origin, and development and
  Vercel each satisfy that on their own — so it only appears when you run
  `npm start` locally or deploy anywhere else.
- The **502 path was unreachable**. `streamText` doesn't throw; a rejected model
  call surfaces inside the stream after a `200` is already sent, so the
  `try/catch` was dead code and the rule in `CLAUDE.md` wasn't being honoured.
- A **confirmation dialog flashed an empty title** during its close animation.
  Only visible by driving the UI.

None of these are subtle in hindsight. All four were invisible from reading.

### Where it got in the way

**It is confidently wrong about its own ecosystem.** Every AI SDK fact it
volunteered from memory was for an older major version. The `node_modules` rule
wasn't optional; without it I'd have shipped several silently broken calls.

**It optimises for the request, not the codebase.** Asked for a button, it
hand-rolls the pending state. Asked for another button, it hand-rolls it again.
By the fourth I had four copies of the same six lines — and it had never
mentioned the pattern. I noticed; it didn't. It's a good bricklayer and an
indifferent architect.

**Verification needs to be demanded — and even demanded, it has edges.** Left
alone it reports "typechecks and lints" as if that were evidence. Typechecking
proves a shape, not a behaviour: the empty-title flash and the dead 502 both
typechecked perfectly.

The sharpest example is a bug we shipped and both missed. A wrong password left
the sign-in button stuck on "Signing in…" with no error, because a rejected
credentials sign-in returns **HTTP 200** with the failure buried in the response
body — so next-auth's `ok` field, which is just `res.ok`, is `true` for a failed
login. We branched on `ok`, and every failed sign-in took the success path.

What makes it instructive is that the failure path *had* been verified — over
HTTP, where it correctly showed no session issued and flat response timing
between a wrong password and an unknown email. Those checks still pass. But the
browser test only ever exercised a *successful* login, so the bug lived exactly
in the gap between the two layers: correct server, correct request, client
reading the wrong field. It surfaced when a human clicked around and a browser
autofilled an email the test database had never heard of.

The lesson I'd carry forward: verifying a path at one layer creates a strong
feeling of coverage that the next layer does not inherit. Ask for the unhappy
path *through the same surface a user touches* — not merely for the unhappy path.

**Automation is not the same as testing.** Synthetic browser clicks silently
failed to reach React's handlers, making a working sign-out button look dead. It
burned real time before we established the harness was at fault, not the code.

## Decisions and trade-offs

The full log is 29 entries; these are the ones I'd defend in review.

**Credentials auth over Clerk or OAuth.** The first criterion is that it runs
from a clean clone. Clerk and GitHub OAuth both fail it — the reviewer has to
create a third-party account and paste keys before anything boots. Rolling your
own password auth is the wrong call in production, and not because hashing is
hard: it means owning password reset, breach-list checks, MFA, and session
revocation. Auth.js's credentials provider also forces JWT sessions, so a
session cannot be killed server-side before it expires. I took that trade
deliberately and mitigated what I could — bcrypt cost 12, an identical error for
wrong-password and no-such-user, a constant-time compare against a decoy hash so
timing doesn't leak account existence, and a **24-hour** session because with no
revocation, `maxAge` *is* the revocation window.

**Ownership pushed into the query, never checked around it.** `Conversation.userId`
is the boundary. Every service call filters on it in the same statement that
finds the row — `findFirst({ where: { id, userId } })`,
`deleteMany({ where: { id, userId } })`, and for messages a `conversation.update`
whose where-unique carries both. There is no unscoped path to forget. A miss
returns 404 with a body byte-identical to a fabricated id, verified with two real
accounts, so the API never confirms someone else's conversation exists.

**One error envelope, status derived from the code.** Clients branch on `code`,
never on message text.

**No half turn on a failed model call.** The user's message commits before the
model is called. If the call fails you get a 502 and no assistant row. I got to
verify this twice — once deliberately, and once when my API key ran out of credit
mid-request.

**TanStack Query for the sidebar only.** `useChat` owns the thread; Query owns
the list; they meet at exactly one seam. Mirroring messages into Query is the bug
that follows otherwise.

**No tests.** The brief doesn't ask for them and opens with "don't gold-plate
it". On four hours, an hour of test infrastructure comes straight out of the
README and this document — two of the six things being graded. Stated plainly:
every refactor from here is verified by hand, and the ownership check that stops
one user reading another's conversations has no regression guard. That's a real
gap, not a neutral one.

## What I'd do differently with more time

**In this order:**

1. **Service-layer tests on the ownership check.** IDOR is the failure that
   matters, and it's the one thing I verified by hand that should be verified by
   CI.
2. **Prompt caching on the chat history.** Every turn re-sends the whole
   conversation, so cost grows with the square of its length. Cache reads are
   ~0.1× and this model's minimum cacheable prefix is 512 tokens, so it would
   start paying off within a couple of turns.
3. **An `ActionButton` and a `ConfirmDialog`.** Four hand-rolled copies of the
   same pending-state logic, and one dialog carrying a close-animation fix that
   every future dialog would otherwise have to rediscover.
4. **The title upgrade.** Designed and deliberately cut: a model call in
   `onFinish` rewrites the truncated title into a real summary. The truncation
   alone is a complete feature, which is exactly why it was the safe thing to
   drop.
5. **A breached-password check at registration** — the control that would
   actually matter, more than any composition rule.

**And two I'd revisit rather than add:** the `dev` → `main` promotion flow costs
a second merge for every fix, and the deep per-domain directory nesting is on the
heavy side for an app this small — both defensible, neither free.
