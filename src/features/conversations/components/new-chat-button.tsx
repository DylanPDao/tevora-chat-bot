"use client";

import { SquarePen } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * Opens the empty composer. It deliberately creates nothing.
 *
 * Creating an untitled conversation here was the interim shape while there was
 * no composer to type into; it is what made every thread "New conversation".
 * Now the conversation is created by the first message, so its title is that
 * message (decisions #13 and #14) — and clicking this repeatedly no longer
 * litters the sidebar with empty threads.
 */
export function NewChatButton(): React.ReactNode {
  return (
    <Button asChild variant="outline" className="w-full justify-start">
      <Link href="/chat">
        <SquarePen className="size-4" />
        New chat
      </Link>
    </Button>
  );
}
