import type { Metadata } from "next";
import "@/styles/globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Pipes",
  description: "Structured system authoring for humans and agents"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="layout-shell"><Providers>{children}</Providers></body>
    </html>
  );
}
