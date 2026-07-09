// app/case-study/page.tsx - Public engineering case study
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  CircleDollarSign,
  Code2,
  Database,
  Github,
  KeyRound,
  LockKeyhole,
  MessagesSquare,
  Route,
  ShieldCheck,
  TestTube2,
  Users,
} from "lucide-react";

import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Engineering Case Study",
  description:
    "How Juntas Seguras models community savings, protects financial workflows, isolates payment providers, and verifies behavior across 97 Jest test files and 16 Playwright specs.",
  alternates: { canonical: "/case-study" },
};

const repositoryUrl = "https://github.com/pgil256/juntas-seguras";

const evidence = [
  { value: "113", label: "API handlers" },
  { value: "97", label: "Jest test files" },
  { value: "16", label: "Playwright specs" },
  { value: "12", label: "Mongoose models" },
];

const architectureLayers = [
  {
    icon: Code2,
    eyebrow: "Experience layer",
    title: "Next.js App Router",
    text: "Responsive product flows built with React, TypeScript, Tailwind CSS, and accessible Radix primitives.",
  },
  {
    icon: Route,
    eyebrow: "Application layer",
    title: "Typed route handlers",
    text: "Authentication, authorization, validation, audit logging, and provider abstractions stay explicit at API boundaries.",
  },
  {
    icon: Database,
    eyebrow: "Domain layer",
    title: "MongoDB + Mongoose",
    text: "Twelve models capture pools, payments, invitations, discussions, receipts, reminders, preferences, and audit events.",
  },
];

const qualityRows = [
  ["Unit", "Jest + Testing Library", "Business rules, services, hooks, and UI behavior"],
  ["Integration", "mongodb-memory-server", "Route handlers, persistence, and model interactions"],
  ["Security", "Jest", "Auth, authorization, validation, and response headers"],
  ["End to end", "Playwright", "Core journeys, mobile behavior, payments, and accessibility"],
  ["Delivery", "GitHub Actions", "Lint, types, tests, production build, and nightly E2E"],
];

export default function CaseStudyPage() {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <MarketingHeader />

      <main>
        <section className="relative isolate overflow-hidden border-b border-slate-200 bg-slate-950 py-20 text-white sm:py-28">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.35),transparent_42%)]" />
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Badge className="border-blue-400/40 bg-blue-500/15 px-3 py-1 text-blue-200 hover:bg-blue-500/15">
              Product design · Full-stack engineering · Security architecture
            </Badge>
            <div className="mt-7 grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
              <div>
                <h1 className="max-w-4xl text-4xl font-black tracking-[-0.04em] sm:text-6xl lg:text-7xl lg:leading-[1.02]">
                  Designing trust into community finance.
                </h1>
                <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300 sm:text-xl">
                  Juntas Seguras is a production-shaped platform for rotating savings groups. The project translates a
                  relationship-based financial practice into explicit software rules without pretending the app should
                  replace the trust between members.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-6">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-300">Project snapshot</p>
                <dl className="mt-5 space-y-4 text-sm">
                  <div className="flex justify-between gap-6"><dt className="text-slate-400">Role</dt><dd className="text-right font-semibold">Sole product engineer</dd></div>
                  <div className="flex justify-between gap-6"><dt className="text-slate-400">Platform</dt><dd className="text-right font-semibold">Responsive web application</dd></div>
                  <div className="flex justify-between gap-6"><dt className="text-slate-400">Stack</dt><dd className="text-right font-semibold">Next.js · TypeScript · MongoDB</dd></div>
                  <div className="flex justify-between gap-6"><dt className="text-slate-400">Deployment</dt><dd className="text-right font-semibold">Vercel · MongoDB Atlas</dd></div>
                </dl>
              </div>
            </div>

            <div className="mt-14 grid grid-cols-2 gap-6 border-t border-slate-800 pt-8 lg:grid-cols-4">
              {evidence.map((item) => (
                <div key={item.label}>
                  <p className="text-3xl font-black tabular-nums sm:text-4xl">{item.value}</p>
                  <p className="mt-1 text-sm text-slate-400">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700">01 · The problem</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Informal coordination creates invisible risk.</h2>
              </div>
              <div className="grid gap-6 text-lg leading-8 text-slate-600">
                <p>
                  Rotating savings and credit associations—often called juntas, tandas, or ROSCAs—depend on every
                  member contributing on time so one participant can receive the pooled payout each round.
                </p>
                <p>
                  Spreadsheets and chat threads can record fragments of that process, but they do not create a shared
                  source of truth for schedules, confirmations, payout order, reminders, and decisions. The product goal
                  was to make those obligations visible while keeping the group administrator in control of real-world funds.
                </p>
                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    { icon: Users, label: "Shared accountability" },
                    { icon: BellRing, label: "Timely coordination" },
                    { icon: ShieldCheck, label: "Verifiable actions" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-900">
                      <item.icon className="mb-3 h-5 w-5 text-blue-700" aria-hidden="true" />
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-slate-50 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700">02 · System design</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Boundaries that keep complexity legible.</h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                The application separates experience, application, and domain concerns so security checks and business rules remain reviewable.
              </p>
            </div>
            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {architectureLayers.map((layer, index) => (
                <Card key={layer.title} className="border-slate-200 shadow-sm">
                  <CardContent className="p-7">
                    <div className="flex items-center justify-between">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-700 text-white">
                        <layer.icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-400">0{index + 1}</span>
                    </div>
                    <p className="mt-7 text-xs font-bold uppercase tracking-[0.14em] text-blue-700">{layer.eyebrow}</p>
                    <h3 className="mt-2 text-xl font-bold">{layer.title}</h3>
                    <p className="mt-3 leading-7 text-slate-600">{layer.text}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Request path</p>
              <div className="mt-5 grid items-center gap-3 text-center text-sm font-semibold sm:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]">
                <span className="rounded-lg bg-slate-100 px-4 py-3">Client flow</span>
                <ArrowRight className="mx-auto h-4 w-4 rotate-90 text-slate-400 sm:rotate-0" />
                <span className="rounded-lg bg-slate-100 px-4 py-3">Auth + validation</span>
                <ArrowRight className="mx-auto h-4 w-4 rotate-90 text-slate-400 sm:rotate-0" />
                <span className="rounded-lg bg-slate-100 px-4 py-3">Domain service</span>
                <ArrowRight className="mx-auto h-4 w-4 rotate-90 text-slate-400 sm:rotate-0" />
                <span className="rounded-lg bg-slate-100 px-4 py-3">Data + audit event</span>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr]">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700">03 · Key decisions</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Scope risk instead of hiding it.</h2>
                <p className="mt-5 text-lg leading-8 text-slate-600">
                  Financial software earns credibility through explicit constraints. These choices keep the demo useful without implying production capabilities it does not have.
                </p>
              </div>
              <div className="space-y-5">
                {[
                  {
                    icon: CircleDollarSign,
                    title: "Track money; do not custody it",
                    text: "Venmo, PayPal, Zelle, and Cash App remain external. The platform records confirmations and payouts without storing card data or silently moving funds.",
                  },
                  {
                    icon: LockKeyhole,
                    title: "Enforce Stripe test mode at the boundary",
                    text: "A payment-provider interface isolates the Stripe proof of concept, while startup validation rejects live keys and every Stripe surface displays a test-mode notice.",
                  },
                  {
                    icon: KeyRound,
                    title: "Layer authorization behind middleware",
                    text: "Middleware improves routing and security headers, but protected route handlers still resolve and authorize the current user before accessing domain data.",
                  },
                  {
                    icon: MessagesSquare,
                    title: "Treat communication as part of the workflow",
                    text: "Discussions, mentions, read receipts, invitations, reminders, and notifications live alongside financial status so decisions retain context.",
                  },
                ].map((decision) => (
                  <div key={decision.title} className="flex gap-5 rounded-2xl border border-slate-200 p-6">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
                      <decision.icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="text-lg font-bold">{decision.title}</h3>
                      <p className="mt-2 leading-7 text-slate-600">{decision.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-slate-950 py-20 text-white sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-300">04 · Verification</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Confidence at multiple levels.</h2>
              <p className="mt-5 text-lg leading-8 text-slate-300">
                Fast tests protect business rules; integration and browser tests protect the seams where most failures appear.
              </p>
            </div>
            <div className="mt-12 overflow-hidden rounded-2xl border border-slate-700">
              <div className="hidden grid-cols-[0.65fr_0.9fr_1.45fr] gap-6 border-b border-slate-700 bg-slate-900 px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 sm:grid">
                <span>Layer</span><span>Tooling</span><span>Coverage</span>
              </div>
              {qualityRows.map(([layer, tooling, coverage]) => (
                <div key={layer} className="grid gap-2 border-b border-slate-800 px-6 py-5 last:border-b-0 sm:grid-cols-[0.65fr_0.9fr_1.45fr] sm:gap-6">
                  <span className="font-bold text-white">{layer}</span>
                  <span className="font-mono text-sm text-blue-300">{tooling}</span>
                  <span className="text-sm leading-6 text-slate-300">{coverage}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 sm:py-24">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700">Explore the work</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Run the product or inspect the implementation.</h2>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
                The repository includes setup instructions, an architecture guide, OpenAPI documentation, demo seed data, CI workflows, and the full test suite.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link href="/auth/signin" className={cn(buttonVariants({ size: "lg" }), "gap-2 bg-blue-700 hover:bg-blue-800")}>Try the demo <ArrowRight className="h-4 w-4" /></Link>
              <Link href={repositoryUrl} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "gap-2 border-slate-300")}><Github className="h-4 w-4" /> View source</Link>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
