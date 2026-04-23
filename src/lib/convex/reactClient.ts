"use client";

import { ConvexReactClient } from "convex/react";

let reactClient: ConvexReactClient | null = null;

export function getConvexReactClient() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL is required in real integration mode.");
  if (!reactClient) reactClient = new ConvexReactClient(url);
  return reactClient;
}
