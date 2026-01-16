import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";
import Sidebar from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "On-site On-Transit",
  description: "Logistics tracking dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-background text-foreground`}>
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="ml-64 flex min-h-screen flex-1 flex-col">
            <header className="sticky top-0 z-10 h-16 border-b border-border bg-card/80 backdrop-blur">
              <div className="flex h-full items-center justify-between px-6">
                <div className="text-sm text-slate-400">Dashboard</div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="h-2 w-2 rounded-full bg-success" />
                  Online
                </div>
              </div>
            </header>
            <main className="flex-1 overflow-y-auto px-6 py-8">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
