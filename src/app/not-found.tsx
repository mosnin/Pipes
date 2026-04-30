"use client";

import { Button } from "@heroui/react";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 text-center px-4">
      <p className="text-8xl font-bold text-indigo-200">404</p>
      <h1 className="text-2xl font-semibold text-gray-900">Page not found</h1>
      <p className="text-gray-500 max-w-sm">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="flex gap-3">
        <Button variant="primary" onPress={() => router.push("/")}>
          Go home
        </Button>
        <Button variant="outline" onPress={() => router.push("/dashboard")}>
          Go to dashboard
        </Button>
      </div>
    </div>
  );
}
