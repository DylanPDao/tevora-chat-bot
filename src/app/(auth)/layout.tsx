import type { ReactNode } from "react";

/**
 * Shared shell for /login and /register — the reason both pages sit in the
 * `(auth)` group. The parentheses keep the segment out of the URL, so this
 * layout applies without becoming a `/auth` path prefix.
 */
export default function AuthLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return (
    <div className="flex flex-1 items-center justify-center p-6">{children}</div>
  );
}
