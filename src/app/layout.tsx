import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Providers } from "@/components/Providers";

/**
 * Pipes uses Podium's design system: Inter (variable, optical sizes) for the
 * interface and Geist Mono for every identifier (node ids, versions, tokens).
 * Both are served from our own origin.
 */
const inter = localFont({
  // The latin file carries both the weight and optical-size axes.
  src: "../../node_modules/@fontsource-variable/inter/files/inter-latin-opsz-normal.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-inter"
});

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
    // The font variables sit on <html> so the :root tokens that read them (--font-sans, --font-mono) resolve.
    <html lang="en" className={`${inter.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
