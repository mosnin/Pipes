"use client";

import Link from "next/link";

export function TrackedLink({ href, event, metadata, className, children }: { href: string; event: string; metadata?: Record<string, unknown>; className?: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        fetch("/api/marketing/signal", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ event, metadata })
        });
      }}
    >
      {children}
    </Link>
  );
}
