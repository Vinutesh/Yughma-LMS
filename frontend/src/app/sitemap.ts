import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/siteUrl";

/** Only the pages a signed-out visitor (or a search engine) can actually
 * reach — everything else requires a session and isn't meant to be indexed
 * (see robots.ts). */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE_URL}/login`, lastModified: now, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/signup`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
