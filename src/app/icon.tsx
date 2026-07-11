// Dynamic favicon. Renders a 32x32 "Pip" monogram in Geist Bold with an
// indigo accent over the "i" — the same typographic flourish as the
// Wordmark component. Generated at the edge by next/og's ImageResponse.
//
// Next.js picks this file up by convention (src/app/icon.tsx) and wires it
// to the <head> as the page favicon. No additional registration needed.

import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "32px",
          height: "32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#111111",
          color: "#FFFFFF",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          fontWeight: 700,
          fontSize: "16px",
          letterSpacing: "-0.04em",
          position: "relative",
          borderRadius: "6px",
        }}
      >
        Pip
        {/* Cover the original dot of the "i". The monogram is centered, so
            the "i" stem lands just right of the "P". */}
        <div
          style={{
            position: "absolute",
            left: "19px",
            top: "8px",
            width: "5px",
            height: "4px",
            background: "#111111",
          }}
        />
        {/* Indigo accent dot. */}
        <div
          style={{
            position: "absolute",
            left: "19px",
            top: "8px",
            width: "4px",
            height: "4px",
            borderRadius: "999px",
            background: "#4F46E5",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
