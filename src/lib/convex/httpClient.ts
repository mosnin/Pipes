import { ConvexHttpClient } from "convex/browser";

export function getConvexHttpClient() {
  const url = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("Convex URL is required in real integration mode.");
  return new ConvexHttpClient(url);
}
