import type { MetadataRoute } from "next";
import { starterTemplates } from "@/domain/templates/catalog";
import { useCases, comparisons } from "@/lib/public/content";
import { APP_BASE_URL } from "@/lib/seo/canonical";

// Single source of truth for the marketing sitemap. Next.js renders this at
// /sitemap.xml; crawlers fetch it once and walk the URL list.
//
// Other agents on the redesign branch are landing additional surfaces
// (customers, changelog, status, security, blog). Those entries are listed
// here as static rows so the sitemap is correct on day one; if a route
// handler is not yet wired, Next's catch-all still serves the entry without
// the renderer crashing.

const BASE = APP_BASE_URL.replace(/\/+$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`,          lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${BASE}/pricing`,   lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/docs`,      lastModified: now, changeFrequency: "weekly",  priority: 0.85 },
    { url: `${BASE}/protocol`,  lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/use-cases`, lastModified: now, changeFrequency: "monthly", priority: 0.75 },
    { url: `${BASE}/templates`, lastModified: now, changeFrequency: "monthly", priority: 0.75 },
    { url: `${BASE}/compare`,   lastModified: now, changeFrequency: "monthly", priority: 0.65 },
    { url: `${BASE}/play`,      lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/login`,     lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${BASE}/signup`,    lastModified: now, changeFrequency: "yearly",  priority: 0.4 },

    // Surfaces other agents on this branch are creating. May 404 until they
    // land; Next handles that gracefully when crawlers refetch.
    { url: `${BASE}/customers`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/changelog`, lastModified: now, changeFrequency: "weekly",  priority: 0.6 },
    { url: `${BASE}/status`,    lastModified: now, changeFrequency: "daily",   priority: 0.5 },
    { url: `${BASE}/security`,  lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/blog`,      lastModified: now, changeFrequency: "weekly",  priority: 0.7 },
  ];

  const templateRoutes: MetadataRoute.Sitemap = starterTemplates.map((t) => ({
    url: `${BASE}/templates/${t.id}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const useCaseRoutes: MetadataRoute.Sitemap = useCases.map((u) => ({
    url: `${BASE}/use-cases/${u.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const compareRoutes: MetadataRoute.Sitemap = comparisons.map((c) => ({
    url: `${BASE}/compare/${c.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.55,
  }));

  return [
    ...staticRoutes,
    ...templateRoutes,
    ...useCaseRoutes,
    ...compareRoutes,
  ];
}
