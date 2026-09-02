import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Yughma LMS",
  description: "Yughma Technologies — Learning Management System",
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
      </body>
    </html>
  );
}
