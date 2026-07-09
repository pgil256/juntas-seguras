// components/marketing/MarketingHeader.tsx - Public-site navigation
"use client";

import { useState } from "react";
import Link from "next/link";
import { Github, Menu, X } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/#how-it-works", label: "Product" },
  { href: "/case-study", label: "Case study" },
  { href: "/help/documentation", label: "Documentation" },
];

const repositoryUrl = "https://github.com/pgil256/juntas-seguras";

export function MarketingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Juntas Seguras home">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-700 text-sm font-bold text-white shadow-sm shadow-blue-700/20">
            JS
          </span>
          <span className="text-lg font-bold tracking-tight text-slate-950">Juntas Seguras</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-slate-600")}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href={repositoryUrl}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "ml-1 gap-2 text-slate-600")}
          >
            <Github className="h-4 w-4" aria-hidden="true" />
            Source
          </Link>
          <span className="mx-2 h-6 w-px bg-slate-200" aria-hidden="true" />
          <Link
            href="/auth/signin"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "border-slate-300")}
          >
            Try the demo
          </Link>
        </nav>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 md:hidden"
          aria-controls="marketing-mobile-menu"
          aria-expanded={mobileMenuOpen}
          aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <nav
          id="marketing-mobile-menu"
          className="border-t border-slate-200 bg-white px-4 py-4 shadow-lg md:hidden"
          aria-label="Mobile navigation"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href={repositoryUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Github className="h-4 w-4" aria-hidden="true" />
              View source
            </Link>
            <Link
              href="/auth/signin"
              className={cn(buttonVariants({ size: "default" }), "mt-2 w-full")}
              onClick={() => setMobileMenuOpen(false)}
            >
              Try the demo
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
