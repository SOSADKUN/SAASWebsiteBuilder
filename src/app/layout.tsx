import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "SERVQOO — Serve Smarter. Grow Better.",
  openGraph: {
    title: "SERVQOO",
    description:
      "Your business workspace. Website, menu and operations in one place.",
    type: "website",
  },
  applicationName: "SERVQOO",
  icons: {
    icon: [{ url: "/brand/favicon.png", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/manifest.webmanifest",
  description:
    "A modular workspace for small businesses. Build your company website with permanent Free Core and try implemented System Services for 14 days.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
