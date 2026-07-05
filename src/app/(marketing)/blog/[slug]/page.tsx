import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getAllPosts,
  getPostBySlug,
  getRelatedPosts,
  getTocForPost,
} from "@/lib/blog/posts";
import { BlogPostLayout } from "@/components/marketing/BlogPostLayout";

interface PageParams {
  slug: string;
}

interface PageProps {
  params: Promise<PageParams>;
}

export function generateStaticParams(): Array<PageParams> {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (post === null) {
    return { title: "Post not found - Pipes" };
  }
  const OG_IMAGE_URL = `/api/og?title=${encodeURIComponent(post.title)}&subtitle=${encodeURIComponent(post.excerpt)}`;
  return {
    title: `${post.title} - Pipes`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article" as const,
      publishedTime: post.date,
      authors: [post.author.name],
      images: [
        { url: OG_IMAGE_URL, width: 1200, height: 630, alt: post.title },
      ],
    },
    twitter: {
      card: "summary_large_image" as const,
      title: post.title,
      description: post.excerpt,
      images: [OG_IMAGE_URL],
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (post === null) {
    notFound();
  }
  const toc = getTocForPost(slug);
  const related = getRelatedPosts(post, 3);
  const Body = post.body;
  // Strip the non-serializable `body` function before crossing the
  // server -> client component boundary. The Body component is rendered
  // here on the server and passed as React children.
  const { body: _body, ...serializablePost } = post;
  return (
    <BlogPostLayout post={serializablePost} toc={toc} related={related}>
      <Body />
    </BlogPostLayout>
  );
}
