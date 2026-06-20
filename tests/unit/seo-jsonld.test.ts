import { describe, expect, it } from "vitest";
import {
  articleJsonLd,
  breadcrumbJsonLd,
  faqPageJsonLd,
  organizationJsonLd,
  softwareApplicationJsonLd,
} from "@/lib/seo/jsonld";

describe("JSON-LD generators", () => {
  it("organizationJsonLd has the right schema.org shape", () => {
    const org = organizationJsonLd();
    expect(org["@context"]).toBe("https://schema.org");
    expect(org["@type"]).toBe("Organization");
    expect(org.name).toBe("Looper");
    expect(org.url.startsWith("http")).toBe(true);
    expect(org.logo.startsWith("http")).toBe(true);
    expect(Array.isArray(org.sameAs)).toBe(true);
  });

  it("organization payload round-trips through JSON.stringify", () => {
    const serialized = JSON.stringify(organizationJsonLd());
    const parsed = JSON.parse(serialized) as { "@type": string };
    expect(parsed["@type"]).toBe("Organization");
  });

  it("softwareApplicationJsonLd uses sensible defaults", () => {
    const app = softwareApplicationJsonLd();
    expect(app["@type"]).toBe("SoftwareApplication");
    expect(app.applicationCategory).toBe("DeveloperApplication");
    expect(app.operatingSystem).toBe("Web");
    expect(app.offers["@type"]).toBe("Offer");
    expect(app.offers.priceCurrency).toBe("USD");
  });

  it("softwareApplicationJsonLd accepts overrides", () => {
    const app = softwareApplicationJsonLd({
      name: "Pipes Protocol",
      description: "MCP for systems.",
      url: "https://pipes.dev/protocol",
      priceUsd: "12",
    });
    expect(app.name).toBe("Pipes Protocol");
    expect(app.description).toBe("MCP for systems.");
    expect(app.url).toBe("https://pipes.dev/protocol");
    expect(app.offers.price).toBe("12");
  });

  it("faqPageJsonLd maps every entry to a Question node", () => {
    const faq = faqPageJsonLd([
      { q: "What counts as a build?", a: "One prompt the agent acts on." },
      { q: "Is there a trial?", a: "Team has a 14-day trial." },
    ]);
    expect(faq["@type"]).toBe("FAQPage");
    expect(faq.mainEntity).toHaveLength(2);
    expect(faq.mainEntity[0]["@type"]).toBe("Question");
    expect(faq.mainEntity[0].name).toBe("What counts as a build?");
    expect(faq.mainEntity[0].acceptedAnswer["@type"]).toBe("Answer");
    expect(faq.mainEntity[0].acceptedAnswer.text).toBe(
      "One prompt the agent acts on.",
    );
  });

  it("faqPageJsonLd handles an empty list cleanly", () => {
    const faq = faqPageJsonLd([]);
    expect(faq.mainEntity).toEqual([]);
  });

  it("articleJsonLd uses Person author when provided, Organization otherwise", () => {
    const withAuthor = articleJsonLd({
      title: "Maya at Northwind",
      description: "How they cut planning time.",
      datePublished: "2026-03-01",
      author: "Maya Reyes",
      url: "https://pipes.dev/use-cases/multi-agent-systems",
    });
    expect(withAuthor["@type"]).toBe("Article");
    expect(withAuthor.author["@type"]).toBe("Person");
    expect(withAuthor.author.name).toBe("Maya Reyes");
    expect(withAuthor.dateModified).toBe("2026-03-01");

    const withoutAuthor = articleJsonLd({
      title: "Docs",
      description: "Reference.",
      datePublished: "2026-01-15",
      url: "https://pipes.dev/docs",
    });
    expect(withoutAuthor.author["@type"]).toBe("Organization");
    expect(withoutAuthor.author.name).toBe("Looper");
  });

  it("articleJsonLd carries publisher, image, and mainEntityOfPage", () => {
    const article = articleJsonLd({
      title: "Pricing FAQ",
      description: "Common questions.",
      datePublished: "2026-02-01",
      dateModified: "2026-05-15",
      url: "https://pipes.dev/pricing",
    });
    expect(article.publisher["@type"]).toBe("Organization");
    expect(article.publisher.logo["@type"]).toBe("ImageObject");
    expect(article.dateModified).toBe("2026-05-15");
    expect(article.image.length).toBeGreaterThan(0);
    expect(article.mainEntityOfPage).toBe("https://pipes.dev/pricing");
  });

  it("breadcrumbJsonLd indexes items 1-based and absolutifies relative URLs", () => {
    const bc = breadcrumbJsonLd([
      { name: "Home", url: "/" },
      { name: "Customers", url: "/use-cases" },
      { name: "Northwind", url: "/use-cases/multi-agent-systems" },
    ]);
    expect(bc["@type"]).toBe("BreadcrumbList");
    expect(bc.itemListElement).toHaveLength(3);
    expect(bc.itemListElement[0].position).toBe(1);
    expect(bc.itemListElement[2].position).toBe(3);
    expect(bc.itemListElement[1].item.startsWith("http")).toBe(true);
    expect(bc.itemListElement[1].item.endsWith("/use-cases")).toBe(true);
  });

  it("breadcrumbJsonLd preserves absolute URLs unchanged", () => {
    const bc = breadcrumbJsonLd([
      { name: "Docs", url: "https://docs.example/docs" },
    ]);
    expect(bc.itemListElement[0].item).toBe("https://docs.example/docs");
  });
});
