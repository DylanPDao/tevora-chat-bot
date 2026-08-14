import type { Metadata } from "next";
import Link from "next/link";

import { AdMarquee } from "@/features/landing/components/ad-marquee";
import { DodgingCloseButton } from "@/features/landing/components/dodging-close-button";
import { UrgencyStrip } from "@/features/landing/components/urgency-strip";

export const metadata: Metadata = {
  title: "Talk to an AI near you",
  description:
    "Conveniently located in this browser tab. Zero miles away. Open all night.",
};

/**
 * The landing page, and the only route outside `(auth)` and `(chat)`.
 *
 * It is styled as the banner ad the headline implies. The joke only works
 * because the app behind the login is not: the front door is all fake urgency
 * and dodging close buttons, and one sign-in later everything is quiet shadcn
 * and legible type. Nothing here leaks into the rest of the app — these are the
 * only components under `features/landing/`, and the animations are namespaced
 * `ad-*` in globals.css.
 *
 * Middleware sends signed-in visitors straight to `/chat`, so this is only ever
 * seen by someone who has not signed in.
 */
export default function LandingPage(): React.ReactNode {
  return (
    <main className="relative flex flex-1 flex-col items-center overflow-hidden bg-[linear-gradient(135deg,#ff007a_0%,#7a00ff_45%,#00d4ff_100%)]">
      <DodgingCloseButton />
      <AdMarquee />

      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-10 text-center">
        <span className="rotate-[-3deg] rounded-full border-2 border-black bg-yellow-300 px-4 py-1 text-xs font-black tracking-widest text-black uppercase shadow-[3px_3px_0_0_#000]">
          ★ 100% free · no download ★
        </span>

        <h1 className="text-5xl font-black tracking-tight text-white uppercase drop-shadow-[3px_3px_0_rgba(0,0,0,0.55)] sm:text-7xl">
          Talk to an AI
          <br />
          <span className="bg-[linear-gradient(90deg,#fff_20%,#ffe600_50%,#fff_80%)] bg-[length:200%_100%] bg-clip-text text-transparent motion-safe:animate-ad-shimmer">
            near you
          </span>
        </h1>

        <UrgencyStrip />

        <div className="flex flex-col items-center gap-3">
          <Link
            href="/register"
            className="rounded-full border-4 border-black bg-yellow-300 px-10 py-4 text-lg font-black tracking-wide text-black uppercase shadow-[5px_5px_0_0_#000] transition-transform hover:translate-y-0.5 hover:shadow-[3px_3px_0_0_#000] motion-safe:animate-ad-throb"
          >
            Chat now →
          </Link>

          {/* The one quiet thing on the page, because it is the one link a
              returning user is actually looking for. */}
          <Link
            href="/login"
            className="text-sm text-white/80 underline underline-offset-4 hover:text-white"
          >
            i already have an account
          </Link>
        </div>

        <p className="max-w-sm text-sm text-white italic">
          “I talked to an AI near me and it explained closures. My life is
          completely different now.”
          <span className="block text-xs text-white/70 not-italic">
            — a real user, probably
          </span>
        </p>
      </div>

      {/* The disclaimer is the punchline: everything above is nonsense, and
          everything here is true. */}
      <footer className="w-full border-t border-white/25 bg-black/25 px-6 py-3 text-center text-[11px] text-white/75">
        Built on Claude. Conversations are private to your account and you can
        delete any of them. No AIs were actually located near you.
      </footer>
    </main>
  );
}
