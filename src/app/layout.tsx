import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter/opsz.css";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Providers } from "@/components/Providers";

/**
 * Pipes uses Podium's design system: Inter (variable, optical sizes) for the
 * interface and Geist Mono for every identifier (node ids, versions, tokens).
 * Both are served from our own origin.
 */
export const metadata: Metadata = {
  title: { default: "Pipes", template: "%s · Pipes" },
  description: "Design, store and run the workflows your agents follow."
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f5" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1c1c" }
  ],
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${GeistMono.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
