"use client";

import { AuthShell } from "@/components/marketing/AuthShell";
import { LoginForm } from "@/components/marketing/LoginForm";

export default function LoginPage() {
  return (
    <AuthShell breadcrumb="Sign in">
      <LoginForm />
    </AuthShell>
  );
}
