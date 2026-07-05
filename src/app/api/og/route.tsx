// Open Graph image generator. Renders a 1200x630 image at the edge using
// next/og's ImageResponse. Used for og:image and twitter:image meta tags on
// shared system links and marketing surfaces.
//
// Query params:
//   ?title=Pipes&subtitle=Describe your system. Watch it build itself.
//
// Both have sensible defaults so an unparameterized hit still renders.

import { ImageResponse } from "next/og";

export const runtime = "edge";

const DEFAULT_TITLE = "Pipes";
const DEFAULT_SUBTITLE = "Describe your system. Watch it build itself.";
const MAX_TITLE = 80;
const MAX_SUBTITLE = 140;

function clamp(input: string | null, fallback: string, max: number): string {
  const value = (input ?? fallback).trim();
  if (value.length === 0) return fallback;
  if (value.length <= max) return value;
  return value.slice(0, max - 1) + "…";
}

export function GET(request: Request): ImageResponse {
  const { searchParams } = new URL(request.url);
  const title = clamp(searchParams.get("title"), DEFAULT_TITLE, MAX_TITLE);
  const subtitle = clamp(searchParams.get("subtitle"), DEFAULT_SUBTITLE, MAX_SUBTITLE);

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background: "#FFFFFF",
          backgroundImage:
            "radial-gradient(circle at 20% 100%, #EEF2FF 0%, transparent 50%), radial-gradient(circle at 100% 0%, #F5F5F7 0%, transparent 40%)",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          color: "#111111",
        }}
      >
        {/* Top-left: brand wordmark + accent dot */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "14px",
              height: "14px",
              borderRadius: "999px",
              background: "#4F46E5",
            }}
          />
          <div
            style={{
              fontSize: "28px",
              fontWeight: 700,
              letterSpacing: "-0.04em",
              color: "#111111",
            }}
          >
            Pipes
          </div>
        </div>

        {/* Center: title + subtitle */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "1040px" }}>
          <div
            style={{
              fontSize: "72px",
              fontWeight: 700,
              letterSpacing: "-0.035em",
              lineHeight: 1.05,
              color: "#111111",
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: "30px",
              fontWeight: 400,
              letterSpacing: "-0.01em",
              lineHeight: 1.35,
              color: "#3C3C43",
            }}
          >
            {subtitle}
          </div>
        </div>

        {/* Bottom: thin accent rule + footer */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div
            style={{
              width: "120px",
              height: "3px",
              background: "#4F46E5",
              borderRadius: "2px",
            }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "20px",
              color: "#8E8E93",
              letterSpacing: "0.01em",
            }}
          >
            <div>One map your team and your agents both read.</div>
            <div>pipes.dev</div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
