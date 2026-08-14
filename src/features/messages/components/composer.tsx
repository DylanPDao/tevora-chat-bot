"use client";

import { ArrowUp, Square } from "lucide-react";
import { useState, type FormEvent, type KeyboardEvent } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type ComposerProps = {
  onSend: (text: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  autoFocus?: boolean;
};

/**
 * The input. `useChat` deliberately owns no input state in v7 — there is no
 * `input` or `handleInputChange` — so it lives here, which also keeps the
 * composer reusable for the new-conversation flow where there is no chat to
 * bind to yet.
 */
export function Composer({
  onSend,
  onStop,
  isStreaming,
  autoFocus = false,
}: ComposerProps): React.ReactNode {
  const [text, setText] = useState("");

  const submit = (): void => {
    const trimmed = text.trim();

    // Whitespace-only submissions are dropped rather than sent — an empty user
    // turn would persist and be shown to the model as a real message.
    if (!trimmed || isStreaming) {
      return;
    }

    setText("");
    onSend(trimmed);
  };

  return (
    <form
      // Matches the thread's max width above it, so the input lines up with the
      // messages instead of spanning a screen they don't.
      className="mx-auto flex w-full max-w-3xl items-end gap-2 border-t p-3"
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        submit();
      }}
    >
      <Textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        // Enter sends, Shift+Enter breaks the line — the convention for chat
        // inputs, and the reason this is a textarea rather than an input.
        onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            submit();
          }
        }}
        placeholder="Send a message…"
        rows={1}
        autoFocus={autoFocus}
        className="max-h-40 min-h-10 resize-none"
        aria-label="Message"
      />

      {isStreaming ? (
        <Button type="button" variant="outline" size="icon" onClick={onStop}>
          <Square className="size-4" />
          <span className="sr-only">Stop generating</span>
        </Button>
      ) : (
        <Button type="submit" size="icon" disabled={!text.trim()}>
          <ArrowUp className="size-4" />
          <span className="sr-only">Send</span>
        </Button>
      )}
    </form>
  );
}
