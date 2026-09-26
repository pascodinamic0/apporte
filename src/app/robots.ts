import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://apporte.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/merchant", "/rider", "/admin", "/checkout", "/order/", "/orders", "/account", "/demo", "/cart", "/offline"],
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
