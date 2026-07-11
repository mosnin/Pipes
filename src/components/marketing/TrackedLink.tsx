"use client";

import Link from "next/link";

interface TrackedLinkProps {
  href: string;
  event: string;
  metadata?: Record<string, unknown>;
  className?: string;
  children: React.ReactNode;
}

export function TrackedLink({
  href,
  event,
  metadata,
  className,
  children,
}: TrackedLinkProps) {
  function handleClick() {
    fetch("/api/marketing/signal", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ event, metadata }),
    });
  }

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}
