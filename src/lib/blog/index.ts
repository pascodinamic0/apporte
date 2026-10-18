import fs from "node:fs";
import path from "node:path";
import type { BlogPost, BlogPostMeta } from "@/lib/blog/types";

export type { BlogPost, BlogPostMeta } from "@/lib/blog/types";

const BLOG_DIR = path.join(process.cwd(), "content/blog");

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return { meta: {}, body: raw };
  }

  const meta: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    meta[key] = value;
  }

  return { meta, body: match[2].trim() };
}

function estimateReadingTime(body: string): number {
  const words = body.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function fileToPost(filePath: string): BlogPost {
  const raw = fs.readFileSync(filePath, "utf8");
  const { meta, body } = parseFrontmatter(raw);
  const slug = path.basename(filePath, ".md");

  return {
    slug,
    title: meta.title ?? slug,
    description: meta.description ?? "",
    date: meta.date ?? "2026-01-01",
    author: meta.author ?? "Apporte",
    category: meta.category ?? "Updates",
    readingTimeMinutes: Number(meta.readingTimeMinutes) || estimateReadingTime(body),
    body,
  };
}

export function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(BLOG_DIR)) return [];

  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => fileToPost(path.join(BLOG_DIR, f)))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  const filePath = path.join(BLOG_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) return undefined;
  return fileToPost(filePath);
}

export function getAllSlugs(): string[] {
  return getAllPosts().map((p) => p.slug);
}

export function toPostMeta(post: BlogPost): BlogPostMeta {
  return {
    slug: post.slug,
    title: post.title,
    description: post.description,
    date: post.date,
    author: post.author,
    category: post.category,
    readingTimeMinutes: post.readingTimeMinutes,
  };
}

export function formatPostDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
