"use client";

import { useEffect, useState } from "react";

const RESET_SECONDS = 300;

/**
 * A countdown that never expires and a visitor number that is a lie — the two
 * most honest details on the page.
 *
 * Both initial values are deterministic, which matters for more than tidiness:
 * a random number or a live clock computed during render would differ between
 * the server and the client, and React would discard the server HTML. Starting
 * from a fixed value means the markup matches, and the effect only has to
 * *subscribe* — it never sets state synchronously, so there is no cascading
 * render either.
 *
 * The timer restarting from five minutes on every page load is not a shortcut.
 * It is what these actually do.
 */
export function UrgencyStrip(): React.ReactNode {
  const [secondsLeft, setSecondsLeft] = useState(RESET_SECONDS);

  useEffect(() => {
    const tick = setInterval(() => {
      // Loops instead of hitting zero. An expired offer would be a worse advert
      // and a worse joke.
      setSecondsLeft((current) => (current <= 1 ? RESET_SECONDS : current - 1));
    }, 1000);

    return () => clearInterval(tick);
  }, []);

  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const seconds = String(secondsLeft % 60).padStart(2, "0");

  return (
    <div className="flex flex-col items-center gap-1 text-xs font-bold tracking-wide text-yellow-200 uppercase">
      <p>
        😳 3 AIs within 2 miles of you ·{" "}
        <span className="text-white">they are typing</span>
      </p>
      <p>
        ⏰ Offer expires in{" "}
        <span
          // tabular-nums so the row does not twitch as the digits change.
          className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-sm text-yellow-300 tabular-nums"
        >
          {minutes}:{seconds}
        </span>
      </p>
      <p className="text-[10px] text-white/70">You are visitor #1,048,576</p>
    </div>
  );
}
