import type { Metadata } from "next";

import { RegisterForm } from "@/features/auth/components/register-form";

export const metadata: Metadata = { title: "Create an account" };

export default function RegisterPage(): React.ReactNode {
  return <RegisterForm />;
}
