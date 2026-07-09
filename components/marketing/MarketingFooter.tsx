// components/marketing/MarketingFooter.tsx - Public-site footer
import Link from "next/link";
import { Github } from "lucide-react";

export function MarketingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white py-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-4 text-center sm:flex-row sm:px-6 sm:text-left lg:px-8">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-700 text-xs font-bold text-white">
            JS
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">Juntas Seguras</p>
            <p className="text-xs text-slate-500">Designed and engineered by Patrick Gilhooley</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-slate-600">
          <Link href="/case-study" className="transition-colors hover:text-slate-950">Case study</Link>
          <Link href="/help/documentation" className="transition-colors hover:text-slate-950">Docs</Link>
          <Link href="/privacy" className="transition-colors hover:text-slate-950">Privacy</Link>
          <Link
            href="https://github.com/pgil256/juntas-seguras"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-slate-950"
          >
            <Github className="h-4 w-4" aria-hidden="true" />
            GitHub
          </Link>
        </div>
      </div>
    </footer>
  );
}
