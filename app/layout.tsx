import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CAD Master Builder",
  description: "Turn a prompt into an engineering-grade 3D model you can view and export.",
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
