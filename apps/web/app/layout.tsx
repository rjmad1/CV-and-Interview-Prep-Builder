import React from "react";
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
      <body className="gradient-bg-purple min-h-screen flex text-slate-100 antialiased selection:bg-purple-500 selection:text-white font-sans">
        {/* Navigation Sidebar Panel */}
        <Sidebar />

        {/* Main Content Layout Wrapper */}
        <main className="flex-1 lg:pl-64 min-h-screen flex flex-col relative z-10 pt-16 lg:pt-0">
          <header className="h-16 border-b border-slate-800 bg-slate-950/20 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-10 hidden lg:flex">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
              <span>ENV: development</span>
              <span className="text-slate-700">|</span>
              <span className="text-purple-400">Gateway: Active</span>
            </div>
            <div className="flex items-center gap-4">
              <button className="px-3 py-1.5 text-xs font-medium rounded-md border border-slate-700 bg-slate-900 hover:bg-slate-800 transition-all flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animated-pulse-ring"></span>
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
