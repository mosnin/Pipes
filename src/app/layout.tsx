import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "@/styles/globals.css";
import { Providers } from "@/components/Providers";
import { SoundProvider } from "@/lib/sound/SoundProvider";
import { ClerkProvider } from "@clerk/nextjs";

// Geist binaries are not checked into the repo. Per the brand-polish spec,
// fall back to Inter (variable, weights 400-700) + JetBrains Mono. Both are
// open-source and CDN-served by next/font/google.
const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans-runtime",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-runtime",
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Pipes",
  description: "One map your team and your agents both read.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-color-scheme="light"
      className={`${sans.variable} ${mono.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
  try {
    var t = localStorage.getItem('pipes-theme');
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
