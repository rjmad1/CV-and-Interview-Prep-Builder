import React, { Suspense } from "react";
import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import Sidebar from "./Sidebar";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Career Intelligence Studio",
  description: "Enterprise Production AI Resume Optimisation & Mock Interview Coaching Platform.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${outfit.variable}`}>
      <body className="bg-m3-surface min-h-screen flex text-slate-100 antialiased selection:bg-m3-primary/30 selection:text-white font-sans">
        {/* Navigation Sidebar Panel */}
        <Suspense fallback={<div className="w-64 bg-[var(--md-sys-color-surface-container-high)] border-r border-[var(--md-sys-color-outline)]/20 h-screen fixed" />}>
          <Sidebar />
        </Suspense>

        {/* Main Content Layout Wrapper */}
        <main className="flex-1 lg:pl-64 min-h-screen flex flex-col relative z-10 pt-16 lg:pt-0">
          <header className="h-16 border-b border-m3-outline/25 bg-m3-surface/60 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-10 hidden lg:flex">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
              <span>ENV: development</span>
              <span className="text-slate-700">|</span>
              <span className="text-m3-primary font-semibold">Gateway: Active</span>
            </div>
            <div className="flex items-center gap-4">
              <button className="px-3.5 py-1.5 text-xs font-medium rounded-full border border-m3-outline/35 bg-m3-surface-container hover:bg-m3-surface-container-high/60 transition-all flex items-center gap-2 text-slate-350">
                <span className="w-2 h-2 rounded-full bg-m3-secondary animated-pulse-ring"></span>
                Local Security RLS Isolated
              </button>
            </div>
          </header>
          <div className="flex-1 p-4 md:p-8">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
