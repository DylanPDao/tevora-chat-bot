const CLAIMS = [
  "⚡ 4 AIs ARE ONLINE RIGHT NOW",
  "★ 100% FREE",
  "🔥 NO CREDIT CARD REQUIRED",
  "⚡ CHAT INSTANTLY",
  "★ NO DOWNLOAD",
  "🔥 WORKS IN YOUR BROWSER",
];

/**
 * The scrolling banner. Static markup, animated in CSS — no client component
 * needed, and no hydration boundary for something that never changes.
 *
 * The track holds the claims twice so the -50% translate lands on the seam and
 * the loop is invisible. Under reduced motion it simply sits still, which is
 * why the list starts with a complete claim rather than mid-sentence.
 */
export function AdMarquee(): React.ReactNode {
  const strip = [...CLAIMS, ...CLAIMS];

  return (
    <div className="w-full overflow-hidden border-y-2 border-yellow-300 bg-black py-1.5">
      <div className="flex w-max motion-safe:animate-ad-marquee">
        {strip.map((claim, index) => (
          <span
            key={index}
            // aria-hidden on the duplicate half, so a screen reader hears the
            // claims once rather than twice.
            aria-hidden={index >= CLAIMS.length}
            className="px-6 text-xs font-bold tracking-widest whitespace-nowrap text-yellow-300 uppercase"
          >
            {claim}
          </span>
        ))}
      </div>
    </div>
  );
}
