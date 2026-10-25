import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NexusAgent | Enterprise Monorepo",
  description: "Production-ready AI Agent Orchestration Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-[#0b0f19] text-slate-100 min-h-screen">{children}</body>
    </html>
  );
}
