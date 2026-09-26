import type { MetadataRoute } from "next";
import { getRestaurants } from "@/src/lib/data/db";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://apporte.vercel.app";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE}/food`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE}/smart-finds`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE}/support`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE}/credits`, lastModified: now, changeFrequency: "monthly", priority: 0.2 },
  ];
  try {
    const restaurants = await getRestaurants();
    for (const r of restaurants) {
      pages.push({ url: `${SITE}/restaurant/${r.id}`, lastModified: now, changeFrequency: "weekly", priority: 0.8 });
    }
  } catch {}
  return pages;
}
