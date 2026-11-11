import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Bloom — Your business, beautifully online",
  description: "A modular website builder for independent businesses.",
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
