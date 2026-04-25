"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button, Card } from "@heroui/react";
import { GitBranch, Check } from "lucide-react";
import { SignupSourceTracker } from "@/components/marketing/SignupSourceTracker";

const BENEFITS = [
  "3 systems free",
  "AI-assisted design",
  "Protocol-ready",
];

function SignupForm() {
  const searchParams = useSearchParams();
  const source = searchParams.get("source") ?? "direct";

  const [name, setName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");

  function handleContinue() {
    const base = "/api/auth/login?returnTo=/onboarding";
    const url = workspaceName
      ? `${base}&workspace=${encodeURIComponent(workspaceName)}`
      : base;
    window.location.href = url;
  }

  return (
    <>
      <SignupSourceTracker source={source} />

      <Card className="w-full max-w-md shadow-lg">
        <Card.Content className="flex flex-col gap-6 p-8">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <GitBranch className="h-6 w-6 text-black" strokeWidth={2} />
            <span className="text-xl font-bold tracking-tight text-black">Pipes</span>
          </div>

          {/* Heading */}
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-gray-900">Create your workspace</h1>
            <p className="text-sm text-gray-500">Free forever. No credit card required.</p>
          </div>

          {/* Benefits */}
          <ul className="flex flex-col gap-2">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-center gap-2 text-sm text-gray-700">
                <Check className="h-4 w-4 text-green-500 shrink-0" strokeWidth={2.5} />
                {benefit}
              </li>
            ))}
          </ul>

          {/* Form */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Your name</label>
              <input
                type="text"
                placeholder="Alex Rivera"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Workspace name</label>
              <input
                type="text"
                placeholder="Acme AI"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <Button
              onPress={handleContinue}
              className="w-full bg-black text-white font-semibold"
              size="lg"
            >
              Continue with Auth0
            </Button>
          </div>

          {/* Sign-in link */}
          <p className="text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link href="/login" className="text-black font-medium underline underline-offset-2 hover:opacity-70">
              Sign in
            </Link>
          </p>
        </Card.Content>
      </Card>
    </>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <Suspense fallback={<div className="w-full max-w-md h-96 rounded-2xl bg-gray-100 animate-pulse" />}>
        <SignupForm />
      </Suspense>
    </div>
  );
}
