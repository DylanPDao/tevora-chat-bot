import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage(): React.ReactNode {
  // The form reads `?from=` through useSearchParams, which opts the subtree
  // into client-side rendering — without a boundary here, Next fails the build
  // rather than rendering the page statically.
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
