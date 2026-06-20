// Typed JSON-LD generators. Each function returns a record that serializes
// directly to JSON-LD per schema.org. The shapes here are narrow on purpose:
// every field is one that crawlers actually consume. Avoid `any` so the
// renderer can stringify without surprises.

import { APP_BASE_URL, canonicalUrl } from "@/lib/seo/canonical";
import { ogImageUrl } from "@/lib/seo/og-variants";

const SCHEMA_CONTEXT = "https://schema.org" as const;

// ─── Organization ────────────────────────────────────────────────────────────

export interface OrganizationJsonLd {
  readonly "@context": typeof SCHEMA_CONTEXT;
  readonly "@type": "Organization";
  readonly name: string;
  readonly url: string;
  readonly logo: string;
  readonly description: string;
  readonly sameAs: readonly string[];
}

export function organizationJsonLd(): OrganizationJsonLd {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "Organization",
    name: "Looper",
    url: canonicalUrl("/"),
    logo: ogImageUrl({ title: "Looper", variant: "default" }),
    description:
      "One map your team and your agents both read. Describe your system. Watch it build itself.",
    sameAs: [],
  };
}

// ─── SoftwareApplication ─────────────────────────────────────────────────────

export interface SoftwareApplicationJsonLd {
  readonly "@context": typeof SCHEMA_CONTEXT;
  readonly "@type": "SoftwareApplication";
  readonly name: string;
  readonly applicationCategory: string;
  readonly operatingSystem: string;
  readonly url: string;
  readonly description: string;
  readonly offers: {
    readonly "@type": "Offer";
    readonly price: string;
    readonly priceCurrency: string;
  };
  readonly aggregateRating?: {
    readonly "@type": "AggregateRating";
    readonly ratingValue: string;
    readonly reviewCount: string;
  };
}

export interface SoftwareApplicationInput {
  readonly name?: string;
  readonly description?: string;
  readonly url?: string;
  readonly priceUsd?: string;
}

export function softwareApplicationJsonLd(
  input: SoftwareApplicationInput = {},
): SoftwareApplicationJsonLd {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "SoftwareApplication",
    name: input.name ?? "Looper",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web",
    url: input.url ?? canonicalUrl("/"),
    description:
      input.description ??
      "Describe your system. Watch it build itself. A canvas for the staff engineer shipping a multi-agent system.",
    offers: {
      "@type": "Offer",
      price: input.priceUsd ?? "0",
      priceCurrency: "USD",
    },
  };
}

// ─── FAQPage ─────────────────────────────────────────────────────────────────

export interface FaqEntry {
  readonly q: string;
  readonly a: string;
}

export interface FaqPageJsonLd {
  readonly "@context": typeof SCHEMA_CONTEXT;
  readonly "@type": "FAQPage";
  readonly mainEntity: ReadonlyArray<{
    readonly "@type": "Question";
    readonly name: string;
    readonly acceptedAnswer: {
      readonly "@type": "Answer";
      readonly text: string;
    };
  }>;
}

export function faqPageJsonLd(faqs: ReadonlyArray<FaqEntry>): FaqPageJsonLd {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question" as const,
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer" as const,
        text: f.a,
      },
    })),
  };
}

// ─── Article ─────────────────────────────────────────────────────────────────

export interface ArticleJsonLd {
  readonly "@context": typeof SCHEMA_CONTEXT;
  readonly "@type": "Article";
  readonly headline: string;
  readonly description: string;
  readonly datePublished: string;
  readonly dateModified: string;
  readonly author: {
    readonly "@type": "Organization" | "Person";
    readonly name: string;
  };
  readonly publisher: {
    readonly "@type": "Organization";
    readonly name: string;
    readonly logo: {
      readonly "@type": "ImageObject";
      readonly url: string;
    };
  };
  readonly image: string;
  readonly mainEntityOfPage: string;
}

export interface ArticleInput {
  readonly title: string;
  readonly description: string;
  readonly datePublished: string;
  readonly dateModified?: string;
  readonly author?: string;
  readonly url: string;
  readonly image?: string;
}

export function articleJsonLd(article: ArticleInput): ArticleJsonLd {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.datePublished,
    dateModified: article.dateModified ?? article.datePublished,
    author: {
      "@type": article.author ? "Person" : "Organization",
      name: article.author ?? "Looper",
    },
    publisher: {
      "@type": "Organization",
      name: "Looper",
      logo: {
        "@type": "ImageObject",
        url: ogImageUrl({ title: "Looper", variant: "default" }),
      },
    },
    image:
      article.image ??
      ogImageUrl({ title: article.title, subtitle: article.description }),
    mainEntityOfPage: article.url,
  };
}

// ─── BreadcrumbList ──────────────────────────────────────────────────────────

export interface BreadcrumbItem {
  readonly name: string;
  readonly url: string;
}

export interface BreadcrumbJsonLd {
  readonly "@context": typeof SCHEMA_CONTEXT;
  readonly "@type": "BreadcrumbList";
  readonly itemListElement: ReadonlyArray<{
    readonly "@type": "ListItem";
    readonly position: number;
    readonly name: string;
    readonly item: string;
  }>;
}

export function breadcrumbJsonLd(
  items: ReadonlyArray<BreadcrumbItem>,
): BreadcrumbJsonLd {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem" as const,
      position: index + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${APP_BASE_URL}${item.url}`,
    })),
  };
}
