import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "@/styles/globals.css";
import { Providers } from "@/components/Providers";
import { SoundProvider } from "@/lib/sound/SoundProvider";
import { ClerkProvider } from "@clerk/nextjs";

// Geist Sans + Geist Mono — Vercel's official open-source typefaces, shipped
// as variable fonts via the `geist` npm package. No asset files required.
// `GeistSans.variable` exposes `--font-geist-sans`; mono is `--font-geist-mono`.

export const metadata: Metadata = {
  title: "Looper",
  description: "One map your team and your agents both read.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-color-scheme="light"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
  try {
    var t = localStorage.getItem('looper-theme');
    var d = t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-color-scheme', d ? 'dark' : 'light');
  } catch(e) {}
`,
          }}
        />
      </head>
      <ClerkProvider>
        <body className="min-h-screen bg-white antialiased">
          <SoundProvider>
            <Providers>{children}</Providers>
          </SoundProvider>
        </body>
      </ClerkProvider>
    </html>
  );
}
