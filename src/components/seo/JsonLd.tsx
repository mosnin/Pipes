// JsonLd renders a single <script type="application/ld+json"> tag with the
// given payload. The payload is serialized with JSON.stringify; pass already-
// typed records from src/lib/seo/jsonld.ts and crawlers get a clean blob.
//
// React would HTML-escape the JSON text inside a normal <script> child, which
// breaks the JSON-LD parser. dangerouslySetInnerHTML is the standard way out
// for this exact use case; the payload is always our own generator output.

import type { JSX } from "react";

export interface JsonLdProps {
  /** Any JSON-serializable payload. Prefer one of the typed generators. */
  readonly data: unknown;
}

export function JsonLd({ data }: JsonLdProps): JSX.Element {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
