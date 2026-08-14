"use client";

import type { UIMessage } from "ai";

import { cn } from "@/shared/utils";

/**
 * One message. Renders from `parts` rather than a flattened string, because
 * `parts` is what the database stores and what the stream produces — going
 * through a derived string would make images or tool calls invisible later
 * rather than merely unstyled.
 *
 * Non-text parts are skipped for now instead of being rendered as `[object
 * Object]`; the assistant's `step-start` part is one of these.
 */
export function MessageBubble({
  message,
}: {
  message: UIMessage;
}): React.ReactNode {
  const isUser = message.role === "user";

  const text = message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");

  // A streaming assistant message exists before it has any text. Rendering an
  // empty bubble is better than nothing appearing — it's the only signal the
  // reply has started.
  if (!text && !isUser) {
    return (
      <div className="flex justify-start">
        <div className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          <span className="inline-block animate-pulse">…</span>
        </div>
      </div>
    );
  }

  if (!text) {
    return null;
  }

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          // whitespace-pre-wrap so the model's own line breaks survive, and
          // break-words so a long URL or token wraps instead of forcing the
          // whole column wider.
          "max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted",
        )}
      >
        {text}
      </div>
    </div>
  );
}
