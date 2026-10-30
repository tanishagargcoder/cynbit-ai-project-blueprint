import type { Metadata } from "next";
import { Familjen_Grotesk, Public_Sans } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const display = Familjen_Grotesk({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const body = Public_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  title: "Project Blueprint | Cynbit prototype",
  description:
    "Describe what you want to build and get a phased plan, suggested stack, timeline range and risks in seconds. A prototype improvement for the Cynbit Technologies website.",
  openGraph: {
    title: "Project Blueprint | Cynbit prototype",
    description: "Turn a rough idea into a phased project plan in two minutes.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IN" className={`${display.variable} ${body.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
