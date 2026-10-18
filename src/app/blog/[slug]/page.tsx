import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  formatPostDate,
  getAllSlugs,
  getPostBySlug,
} from "@/lib/blog";
import { BlogPostBody } from "@/lib/blog/render";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-static";

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Not found" };
  return {
    title: post.title,
    description: post.description,
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <Link
        href="/blog"
        className="text-sm font-medium text-neutral-500 hover:text-emerald-700"
      >
        ← Tous les articles
      </Link>
      <div className="mt-6 flex flex-wrap items-center gap-2 text-sm text-neutral-500">
        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 font-medium text-emerald-800">
          {post.category}
        </span>
        <time dateTime={post.date}>{formatPostDate(post.date)}</time>
        <span>{post.readingTimeMinutes} min</span>
        <span>· {post.author}</span>
      </div>
      <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{post.title}</h1>
      <p className="mt-3 text-lg text-neutral-600">{post.description}</p>
      <div className="mt-10">
        <BlogPostBody body={post.body} />
      </div>
    </div>
  );
}
