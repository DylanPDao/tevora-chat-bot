import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Talk to an AI near you",
  description:
    "Conveniently located in this browser tab. Zero miles away. Open all night.",
};

/**
 * The landing page, and the only route outside `(auth)` and `(chat)`.
 *
 * Middleware sends signed-in visitors straight to `/chat`, so this is only ever
 * seen by someone who has not signed in — which is why it can be all pitch and
 * no product.
 */
export default function LandingPage(): React.ReactNode {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 p-6 text-center">
      <div className="flex flex-col items-center gap-4">
        <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          Now serving · this tab
        </p>

        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
          Talk to an AI
          <br className="sm:hidden" />{" "}
          {/* The joke is the whole page, so it gets the emphasis. */}
          <span className="relative whitespace-nowrap">
            near you
            {/* A blinking caret, because the punchline is that "near you" means
                a text box. `motion-safe` so it stays still for anyone who has
                asked their system to stop animating things. */}
            <span
              aria-hidden="true"
              className="ml-1 inline-block h-[0.9em] w-[3px] translate-y-[0.08em] bg-foreground motion-safe:animate-pulse"
            />
          </span>
        </h1>

        <p className="max-w-md text-pretty text-muted-foreground">
          Zero miles away. Open all night, no appointment, no parking to
          validate. Ask it anything and it will have a go.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/register">Start chatting</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>

      <p className="max-w-sm text-xs text-muted-foreground">
        Built on Claude. Conversations are private to your account and you can
        delete any of them.
      </p>
    </main>
  );
}
