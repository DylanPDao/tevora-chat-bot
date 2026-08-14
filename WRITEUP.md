# Write-up

## How I used AI tooling

I built this with Claude Code. The short version: it wrote most of the lines, I
decided what the lines had to guarantee.

### What worked

**Talking through each phase before writing any of it.** This sounds like
overhead and wasn't. The best example came from the cheapest-looking task in the
project — adding a landing page. That's a one-file change. But talking it
through first surfaced that the app matched public routes with `startsWith`, so
adding `"/"` to that list would have matched *every* path in the app and quietly
turned route protection off. Login would still work. Sign-out would still work.
Every conversation would have been readable without signing in. Thirty seconds
of conversation caught something that's nearly invisible in review, because the
diff is one string in an array.

The same habit did quieter work too. Asking "what are our options here?" instead
of "build this" turned up a Prisma feature that let me put the ownership check
*inside* the database write rather than in an `if` wrapped around it — so
there's no unguarded path for a future caller to stumble onto. It also caught me
contradicting myself: I'd written down that conversations get created before
streaming starts *and* that they're named after the first message, which can't
both be true if creation happens first.

**Making it check the installed packages instead of trusting its memory.** I put
a rule in `CLAUDE.md`: read the actual type definitions before using anything
from the AI SDK. Every single fact it offered from memory was for an older
version. `useChat` doesn't have the properties it thought. One function it
suggested is deprecated. And `maxTokens` — the option it reached for to cap
response length — doesn't exist in this version at all. That last one is the
scary kind of wrong, because the code looks like it sets a limit and silently
doesn't.

**Asking for proof, not just the feature.** "Build the delete endpoint" gets you
an endpoint. "Show me user B can't delete user A's conversation" gets you the
endpoint plus two real accounts and a byte-for-byte comparison of the two 404
responses. Nearly everything in the commit log has a check behind it, and the
checks found things that reading never would.

### What I handed off, and what I kept

I handed off almost all the implementation, and all of the "what is this
actually called" work — reading type definitions, checking what a config helper
resolves, tracing which environment variable something reads. That's tedious and
mechanical and a tool with a terminal is genuinely better at it than I am.

I kept every decision with a trade-off in it. How long sessions last. Password
rules. Whether a feature was worth building at all. Whether an abstraction
earned its place. I also kept the structural arguments — I pushed back on
layouts it proposed more than once, and once it pushed back on me with a better
reason than I had.

I wrote decisions down as I made them rather than reconstructing them later,
which is why this document is built from notes instead of memory.

### Where it really helped

Finding bugs I wouldn't have thought to look for.

- **The clean clone was broken**, and I only found out by having it actually
  clone the repo somewhere else and follow my own README. It failed on the first
  command. The setup step I'd added specifically to make a fresh clone work was
  the thing breaking it.
- **A production build couldn't sign anyone in.** Auth.js won't trust the host
  header in production unless it can verify where it's running, and both local
  development and Vercel happen to satisfy that on their own — so the problem
  only appears anywhere else.
- **The 502 handler was dead code.** A failed model call doesn't throw, it fails
  inside the stream after the response has already started, so the error
  handling I'd written could never run.
- **A confirmation dialog flashed an empty name** while it was closing. Only
  visible by actually clicking it.

None of these are clever in hindsight. All four were invisible from reading the
code.

### Where it got in the way

**It's confidently wrong about its own ecosystem.** See above — without the
check-the-source rule I'd have shipped several quietly broken calls.

**It solves the request, not the codebase.** Ask for a button, it hand-rolls the
loading state. Ask for another, it hand-rolls it again. By the fourth I had four
copies of the same six lines and it had never once mentioned the pattern. Good
bricklayer, indifferent architect.

**"Typechecks and lints" gets reported like evidence.** It isn't. Typechecking
proves a shape, not a behaviour — the dead 502 and the flashing dialog both
typechecked perfectly.

The sharpest example is a bug we shipped together. A wrong password left the
sign-in button stuck on "Signing in…" with no error at all. The cause: a
rejected login comes back as a *successful* HTTP response with the failure
tucked inside the body, so the library's `ok` field is `true` even when the
login failed. We checked `ok`, so every failed login took the success path.

What makes it worth writing down is that I *had* tested that path — over HTTP,
where it correctly showed no session was created. That test still passes. But
the browser test only ever tried a password that worked. The bug lived in the
gap between the two, and it surfaced when a real person clicked around and their
browser autofilled an email my test database had never heard of.

The lesson I'd carry forward: checking a path at one layer feels like coverage,
and the next layer doesn't inherit it. Ask for the unhappy path *through the
same surface a person actually touches*.

## Decisions and trade-offs

**Password auth instead of Clerk or OAuth.** The first thing you said you'd
check is that it runs from a clean clone. Clerk and GitHub OAuth both fail that
— you'd have to create a third-party account and paste keys in before anything
starts. Rolling your own password auth is the wrong call in production, and not
because hashing is hard: it means owning password resets, breach checks, MFA,
and session revocation. I took that trade knowingly and mitigated what I could —
bcrypt at cost 12, the same error message whether the password is wrong or the
account doesn't exist, a dummy hash comparison so response timing doesn't leak
which one it was, and 24-hour sessions because with no way to revoke a token,
its lifetime *is* the revocation window.

**Ownership goes in the query, not in an `if` after it.** Every lookup filters
on the user as well as the id, in the same statement. There's no unscoped path
to forget. A miss returns a 404 identical to one for an id that never existed,
so the API won't even confirm someone else's conversation is real. Verified with
two accounts.

**One error shape everywhere**, with the HTTP status derived from a code, so
clients branch on the code instead of matching message text.

**A failed model call never leaves half a turn behind.** Your message is saved
before the model is called; if the call fails you get a 502 and no reply row. I
got to see this work twice — once on purpose, and once when my API credit ran
out mid-request.

**No tests.** You said not to gold-plate it, and tests aren't in the brief. On a
four-hour budget an hour of test setup comes straight out of the README and this
document. Being straight about the cost: every change from here is checked by
hand, and the ownership rule — the thing keeping one person's conversations away
from another's — has nothing watching it. That's a real gap, not a neutral one.

## What I'd do next

**Roughly in this order:**

1. **Tests on the ownership rule.** It's the one thing I checked by hand that
   really ought to be checked automatically, every time. Right now a future
   change could quietly undo it and everything would still compile.
2. **A way to end a session early.** Password auth means sessions can't be
   revoked before they expire, which is why they only last a day. Adding a
   "sessions issued before this moment are no longer valid" timestamp fixes it
   in about twenty lines, and it's the biggest real gap in the auth.
3. **Rate limiting on sign-up and chat** — brute-force protection on one, cost
   control on the other. Neither has any right now.
4. **Tidy up the repetition.** A small helper is copy-pasted between two files,
   the "is this person signed in?" check is duplicated in every route, and the
   button loading state is hand-written four times. The route one matters most:
   wrapping it would turn "is every endpoint protected?" from something you read
   four files to confirm into something you can search for.
5. **Cache the conversation history sent to the model.** Every message re-sends
   the whole thread, so cost climbs steeply as conversations grow. Caching cuts
   the repeated part to about a tenth.
6. **Check new passwords against known breaches** — worth far more than any
   rule about symbols and capital letters.

**Further out**, and really one feature with three names: roles and permissions,
an audit log, and an admin panel to make both legible. Alongside those, per-user
spending limits (monitoring tells you someone spent forty dollars; a limit stops
them) and a way to delete your account — conversations clean up after
themselves today, but people can't remove themselves.

**And one I designed and then deliberately dropped:** having the model write a
proper title for each conversation. Right now the title is just the first line
you typed, trimmed. That works completely on its own, which is exactly why it
was the safe thing to cut.

**Two things I'd reconsider rather than add:** the branching setup costs an
extra merge for every fix, and the folder structure is heavier than an app this
size needs. Both defensible, neither free.
