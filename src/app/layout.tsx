import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Providers } from "@/components/Providers";

/**
 * Pipes shares the Company OS design language wholesale: Geist Sans for the
 * interface, Geist Mono for every identifier (node ids, pipe ids, versions,
 * tokens). Served from our own origin via the `geist` package.
 */
export const metadata: Metadata = {
  title: { default: "Pipes", template: "%s · Pipes" },
  description: "Design, store and run the workflows your agents follow."
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1f1f1" },
    { media: "(prefers-color-scheme: dark)", color: "#212121" }
  ],
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
