"use client";

import { X } from "lucide-react";
import { useState } from "react";

const CORNERS = [
  "top-2 right-2",
  "top-2 left-2",
  "bottom-2 right-2",
  "bottom-2 left-2",
] as const;

/**
 * The close button that will not be closed. It jumps to another corner on
 * hover, which is the single most recognisable thing about the genre.
 *
 * `aria-hidden` and `tabIndex={-1}`: it is a joke rendered as a button, and a
 * keyboard or screen-reader user should not be handed a control whose entire
 * behaviour is to evade them. Everything real on this page is reachable without
 * it.
 */
export function DodgingCloseButton(): React.ReactNode {
  const [corner, setCorner] = useState(0);

  return (
    <button
      type="button"
      aria-hidden="true"
      tabIndex={-1}
      onMouseEnter={() => setCorner((current) => (current + 1) % CORNERS.length)}
      onClick={() => setCorner((current) => (current + 1) % CORNERS.length)}
      className={`absolute ${CORNERS[corner]} z-20 grid size-7 place-items-center rounded-full border border-white/40 bg-black/40 text-white/80 transition-all hover:text-white`}
    >
      <X className="size-4" />
    </button>
  );
}
