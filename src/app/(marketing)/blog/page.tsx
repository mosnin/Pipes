import type { Metadata } from "next";
import { getAllPostMetas, getAllTags } from "@/lib/blog/posts";
import { BlogIndex } from "./BlogIndex";

const TITLE = "Notes from the team.";
const SUBTITLE =
  "Posts about how we build Pipes. Mostly engineering. Occasionally company.";

const OG_IMAGE_URL = `/api/og?title=${encodeURIComponent(TITLE)}&subtitle=${encodeURIComponent(SUBTITLE)}`;

export const metadata: Metadata = {
  title: "Blog - Pipes",
  description: SUBTITLE,
  openGraph: {
    title: TITLE,
    description: SUBTITLE,
    type: "website" as const,
    images: [{ url: OG_IMAGE_URL, width: 1200, height: 630, alt: TITLE }],
  },
  twitter: {
    card: "summary_large_image" as const,
    title: TITLE,
    description: SUBTITLE,
    images: [OG_IMAGE_URL],
  },
};

export default function BlogPage() {
  const posts = getAllPostMetas();
  const tags = getAllTags();
  return <BlogIndex posts={posts} tags={tags} />;
}
