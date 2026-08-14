"use client";

import type { UIMessage } from "ai";
import { useEffect, useRef } from "react";

import { MessageBubble } from "@/features/messages/components/message-bubble";
import { Alert, AlertDescription } from "@/components/ui/alert";

type MessageListProps = {
  messages: UIMessage[];
  error: Error | undefined;
};

export function MessageList({
  messages,
  error,
}: MessageListProps): React.ReactNode {
  const endRef = useRef<HTMLDivElement>(null);

  // Follow the stream. The dependency is the message *count* plus the last
  // message's text length, so this also fires on each delta rather than only
  // when a new message appears — otherwise the view sticks at the top of a long
  // reply while it writes.
  const lastLength = messages.at(-1)?.parts.length ?? 0;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, lastLength]);

  if (!messages.length && !error) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">
          Send a message to start this conversation.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            {/* The API's message, when the envelope survived — the transport
                surfaces a generic one for stream-level failures. */}
            {error.message || "Something went wrong. Try sending that again."}
          </AlertDescription>
        </Alert>
      )}

      <div ref={endRef} />
    </div>
  );
}
