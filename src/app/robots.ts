import type { MetadataRoute } from "next";
import { APP_BASE_URL } from "@/lib/seo/canonical";

// Robots policy. Marketing surfaces are crawlable. App shell, API, settings,
// and the editor itself are not - they require an authenticated session and
// have no SEO value.

const BASE = APP_BASE_URL.replace(/\/+$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard",
          "/settings",
          "/admin",
          "/systems",
          "/welcome",
          "/onboarding",
          "/invites/",
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
