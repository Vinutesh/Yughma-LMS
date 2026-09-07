import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Providers } from "./providers";
import { SITE_URL } from "@/lib/siteUrl";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Yughma LMS",
    template: "%s — Yughma LMS",
  },
  description: "Yughma Technologies — Learning Management System",
  // Favicon/apple-touch-icon come from the src/app/icon.png + apple-icon.png
  // file convention below — Next.js auto-generates the right <link> tags
  // from those; setting `icons` here too would conflict with that instead
  // of adding to it.
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Yughma LMS",
    description: "Yughma Technologies — Learning Management System",
    siteName: "Yughma LMS",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Yughma LMS",
    description: "Yughma Technologies — Learning Management System",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0d1f16",
};

// Runs before React hydrates so the correct theme applies on first paint —
// avoids a flash of the wrong theme. Reads the same key the theme toggle writes.
const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem("yughma-theme");
    if (stored === "dark" || stored === "light") {
      document.documentElement.setAttribute("data-theme", stored);
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full antialiased">
        <Providers>{children}</Providers>
        {/* Vercel Analytics is cookie-free (no personal data, no consent
            banner needed) — page views only, aggregated. */}
        <Analytics />
      </body>
    </html>
  );
}
