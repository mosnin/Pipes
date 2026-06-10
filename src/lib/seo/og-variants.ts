// OG image variant registry. Each marketing surface picks a variant that
// changes the visual treatment in the OG renderer at /api/og. The variants
// are a closed enum so callers cannot drift into untyped strings.

import { APP_BASE_URL } from "@/lib/seo/canonical";

export const OG_VARIANTS = [
  "default",
  "pricing",
  "protocol",
  "docs",
  "use-case",
  "compare",
  "template",
] as const;

export type OgVariant = (typeof OG_VARIANTS)[number];

/** Type guard for use at the route boundary. */
export function isOgVariant(value: string | null): value is OgVariant {
  return value != null && (OG_VARIANTS as readonly string[]).includes(value);
}

/** Parse an unknown query value into a variant; falls back to "default". */
export function parseOgVariant(value: string | null): OgVariant {
  return isOgVariant(value) ? value : "default";
}

export interface OgImageParams {
  readonly title: string;
  readonly subtitle?: string;
  readonly variant?: OgVariant;
}

/**
 * Build the absolute URL to the OG image route for a given page. Pass this
 * straight into `metadata.openGraph.images` or `metadata.twitter.images`.
 */
export function ogImageUrl(params: OgImageParams): string {
  const search = new URLSearchParams();
  search.set("title", params.title);
  if (params.subtitle) search.set("subtitle", params.subtitle);
  if (params.variant && params.variant !== "default") {
    search.set("variant", params.variant);
  }
  const trimmedBase = APP_BASE_URL.replace(/\/+$/, "");
  return `${trimmedBase}/api/og?${search.toString()}`;
}

/** Default 1200x630 dimensions every variant renders at. */
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;
