import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts, formatPostDate } from "@/lib/blog";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Articles",
  description: "Livraison, restaurants et trouvailles à Kinshasa.",
};

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
        Blog Apporte
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Articles</h1>
      <p className="mt-3 text-neutral-600">Livraison, restaurants et trouvailles à Kinshasa.</p>

      <section className="mt-10 space-y-6">
        {posts.length === 0 ? (
          <p className="text-neutral-500">Aucun article pour le moment.</p>
        ) : (
          posts.map((post) => (
            <article
              key={post.slug}
              className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 font-medium text-emerald-800">
                  {post.category}
                </span>
                <time dateTime={post.date}>{formatPostDate(post.date)}</time>
                <span>{post.readingTimeMinutes} min</span>
              </div>
              <h2 className="mt-3 text-lg font-semibold">
                <Link href={`/blog/${post.slug}`} className="hover:text-emerald-700">
                  {post.title}
                </Link>
              </h2>
              <p className="mt-2 text-sm text-neutral-600">{post.description}</p>
              <Link
                href={`/blog/${post.slug}`}
                className="mt-3 inline-block text-sm font-medium text-emerald-700 hover:underline"
              >
                Lire →
              </Link>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
