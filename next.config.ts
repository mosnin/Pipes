import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1"],
  // The skills catalog is read from disk at request time (src/lib/skills/catalog.ts).
  outputFileTracingIncludes: { "/api/mcp": ["./src/skills/**/*"], "/settings/agents": ["./src/skills/**/*"], "/api/runs/[runId]": ["./src/skills/**/*"] },
  // Security headers on every response (docs/security.md). The CSP sets only directives that never break
  // Next's own scripts: no framing, no plugins, no foreign base URLs. form-action is left out on purpose:
  // OAuth consent posts a form that redirects to the client's callback, which form-action would block.
  async headers() {
    const headers = [
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" }
    ];
    if (process.env.NODE_ENV === "production") headers.push({ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" });
    return [{ source: "/:path*", headers }];
  },
  experimental: {
    // Load only the modules each import uses. lucide-react is on Next's default
    // list already; it is named here so the intent is explicit.
    optimizePackageImports: ["lucide-react", "motion"]
  }
};

export default nextConfig;
