import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/siteUrl";

/**
 * Almost the entire app sits behind login (courses, dashboards, admin
 * screens) — nothing in there is meant to be indexed, and a crawler
 * wandering through /manage/* with no session just wastes its budget on
 * redirects to /login. Only the genuinely public pages are left open.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/login", "/signup", "/privacy", "/terms"],
      disallow: ["/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
