import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "SERVQO — Serve Smarter. Grow Better.",
  applicationName: "SERVQO",
  icons: {
    icon: [{ url: "/brand/favicon.png", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/manifest.webmanifest",
  description:
    "A thoughtful workspace for hospitality businesses. Build your website and your next great first impression with SERVQO.",
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
