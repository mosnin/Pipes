import type { Metadata } from "next";
import "@/styles/globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Pipes",
  description: "One map your team and your agents both read.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-color-scheme="light">
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
      <body className="min-h-screen bg-white antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
