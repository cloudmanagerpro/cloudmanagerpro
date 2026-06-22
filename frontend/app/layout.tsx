import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "CloudManagerPro — Multi-cloud FinOps, self-hosted",
    template: "%s · CloudManagerPro",
  },
  description:
    "Open-source, self-hostable multi-cloud FinOps platform. Track spend, eliminate waste, right-size resources and enforce tagging across AWS, Azure and GCP.",
  keywords: [
    "FinOps",
    "cloud cost management",
    "AWS",
    "Azure",
    "GCP",
    "self-hosted",
    "open source",
  ],
  authors: [{ name: "CloudManagerPro" }],
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0b" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className={cn("min-h-screen bg-background font-sans antialiased")}>
        <Providers>{children}</Providers>
        <Toaster position="top-right" closeButton richColors />
      </body>
    </html>
  );
}
