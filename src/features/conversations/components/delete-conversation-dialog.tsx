"use client";

import { useRouter } from "next/navigation";

import type { Conversation } from "@/features/conversations/api/conversations-api";
import { useDeleteConversation } from "@/features/conversations/hooks/use-delete-conversation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type DeleteConversationDialogProps = {
  /** The row awaiting confirmation, or null when the dialog is closed. */
  conversation: Conversation | null;
  onClose: () => void;
  /** True when this conversation is the one currently open. */
  isActive: boolean;
};

/**
 * Deleting cascades to every message in the thread and cannot be undone, which
 * is why this exists at all rather than a bare button.
 *
 * `alert-dialog` rather than `dialog`: Radix gives it `role="alertdialog"`,
 * refuses to close on an outside click, and focuses Cancel. A destructive
 * confirm that dismisses because you clicked beside it is the failure mode
 * `dialog` would introduce.
 */
export function DeleteConversationDialog({
  conversation,
  onClose,
  isActive,
}: DeleteConversationDialogProps): React.ReactNode {
  const router = useRouter();
  const { mutate, isPending } = useDeleteConversation();

  const confirm = (): void => {
    if (!conversation) {
      return;
    }

    mutate(conversation.id, {
      onSettled: () => {
        // Navigate only when the open thread is the one that went away —
        // deleting a different row should leave the reader where they are.
        // onSettled, not onSuccess: a 404 means it is gone or was never
        // theirs, and either way staying on the page shows a thread that
        // isn't there.
        if (isActive) {
          router.push("/chat");
        }

        onClose();
      },
    });
  };

  return (
    <AlertDialog
      open={conversation !== null}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this conversation?</AlertDialogTitle>
          <AlertDialogDescription>
            {/* Naming the thread matters: the trigger is a small icon on a
                hover-revealed row, so it is genuinely possible to open this
                for the wrong one. */}
            “{conversation?.title}” and every message in it will be deleted.
            This can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            // Kept from closing on click so the dialog stays put while the
            // request is in flight, rather than vanishing and leaving no
            // indication that anything is happening.
            onClick={(event) => {
              event.preventDefault();
              confirm();
            }}
          >
            {isPending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
