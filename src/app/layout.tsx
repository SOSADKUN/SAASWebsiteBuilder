import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "SERVQO — Serve Smarter. Grow Better.",
  applicationName: "SERVQO",
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
