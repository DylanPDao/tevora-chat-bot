"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useCallback } from "react";
import { useForm } from "react-hook-form";

import { useRegister } from "@/features/auth/hooks/use-register";
import {
  PASSWORD_MIN,
  registerSchema,
  type RegisterInput,
} from "@/features/auth/schemas/auth-schemas";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

export function RegisterForm(): React.ReactNode {
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", name: "" },
  });

  const { setError } = form;

  // Server-side failures land in the same error store as client validation, so
  // FormMessage renders both and a field has exactly one source of truth.
  const setFieldError = useCallback(
    (field: keyof RegisterInput, message: string): void => {
      setError(field, { message });
    },
    [setError],
  );

  const { submit, error, isPending } = useRegister({
    redirectTo: "/chat",
    setFieldError,
  });

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>It takes a moment.</CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(submit)}
            className="flex flex-col gap-4"
            noValidate
          >
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input autoComplete="name" {...field} />
                  </FormControl>
                  <FormDescription>Optional.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    At least {PASSWORD_MIN} characters. No symbol requirements.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating account…" : "Create account"}
            </Button>

            <p className="text-sm text-muted-foreground">
              Already registered?{" "}
              <Link href="/login" className="underline underline-offset-4">
                Sign in
              </Link>
            </p>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
