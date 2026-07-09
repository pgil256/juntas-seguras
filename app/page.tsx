// app/page.tsx - Portfolio-ready product landing page
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  CircleDollarSign,
  Code2,
  Github,
  KeyRound,
  Layers3,
  LockKeyhole,
  MessageSquareText,
  ScanLine,
  ShieldCheck,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";

import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const repositoryUrl = "https://github.com/pgil256/juntas-seguras";

const productSteps = [
  {
    step: "01",
    title: "Create the pool",
    description: "Set the contribution, cadence, payout order, and rules for a trusted savings group.",
    icon: WalletCards,
  },
  {
    step: "02",
    title: "Coordinate members",
    description: "Invite participants, discuss each round, send reminders, and keep responsibilities visible.",
    icon: Users,
  },
  {
    step: "03",
    title: "Track every round",
    description: "Confirm contributions, release payouts, and preserve a complete activity and audit history.",
    icon: TrendingUp,
  },
];

const productFeatures = [
  {
    title: "Identity and access",
    description: "Mandatory email or TOTP MFA, OAuth support, protected routes, and rate-limited authentication flows.",
    icon: KeyRound,
  },
  {
    title: "Transparent payments",
    description: "Manual payment tracking, QR codes, deep links, and an isolated Stripe test-mode provider flow.",
    icon: CircleDollarSign,
  },
  {
    title: "Community coordination",
    description: "Invitations, reminders, threaded discussions, @mentions, read receipts, and direct messaging.",
    icon: MessageSquareText,
  },
  {
    title: "Traceable decisions",
    description: "Role-aware actions, contribution history, payout status, notifications, and comprehensive audit logs.",
    icon: ScanLine,
  },
];

const engineeringSignals = [
  { value: "113", label: "API handlers", detail: "Across 61 App Router route files" },
  { value: "97", label: "Jest test files", detail: "Unit, integration, security, and performance" },
  { value: "16", label: "Playwright specs", detail: "Journeys, mobile, payments, and accessibility" },
  { value: "12", label: "Data models", detail: "Typed Mongoose domain model" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-slate-950">
      <MarketingHeader />

      <main>
        <section className="relative isolate overflow-hidden border-b border-slate-200">
          <div className="absolute inset-0 -z-20 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:40px_40px] opacity-35" />
          <div className="absolute left-1/2 top-0 -z-10 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-blue-100/70 blur-3xl" />

          <div className="mx-auto grid max-w-7xl gap-14 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8 lg:py-28">
            <div className="max-w-2xl">
              <Badge variant="info" className="mb-6 gap-2 px-3 py-1.5 text-sm">
                <Code2 className="h-3.5 w-3.5" aria-hidden="true" />
                Full-stack fintech portfolio project
              </Badge>
              <h1 className="text-4xl font-black tracking-[-0.04em] text-slate-950 sm:text-6xl lg:text-7xl lg:leading-[0.98]">
                Community savings, made transparent.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600 sm:text-xl">
                Juntas Seguras turns rotating savings groups into a secure, auditable workflow for contributions,
                payouts, member coordination, and shared accountability.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/auth/signin"
                  className={cn(buttonVariants({ size: "lg" }), "gap-2 bg-blue-700 shadow-lg shadow-blue-700/20 hover:bg-blue-800")}
                >
                  Explore the demo
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/case-study"
                  className={cn(buttonVariants({ variant: "outline", size: "lg" }), "border-slate-300 bg-white/80")}
                >
                  Read the case study
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-600">
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                  Mandatory MFA
                </span>
                <span className="inline-flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 text-blue-700" aria-hidden="true" />
                  Audit-first workflows
                </span>
                <span className="inline-flex items-center gap-2">
                  <Github className="h-4 w-4 text-slate-700" aria-hidden="true" />
                  Open source
                </span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-xl">
              <div className="absolute -inset-3 -z-10 rotate-2 rounded-[2rem] bg-blue-200/60" />
              <div className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-900/15 sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Family Savings Pool</p>
                    <p className="mt-1 text-3xl font-bold tabular-nums text-slate-950">$2,400.00</p>
                  </div>
                  <Badge variant="success" className="gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    On track
                  </Badge>
                </div>

                <div className="mt-7">
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="text-slate-500">Round 3 of 6</span>
                    <span className="font-semibold tabular-nums text-slate-700">50%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full w-1/2 rounded-full bg-blue-700" />
                  </div>
                </div>

                <div className="mt-7 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Next payout</p>
                    <p className="mt-2 font-semibold text-slate-900">Maria Santos</p>
                    <p className="mt-1 text-sm text-slate-500">Due August 1</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Contributed</p>
                    <p className="mt-2 font-semibold tabular-nums text-slate-900">4 of 6</p>
                    <p className="mt-1 text-sm text-slate-500">2 reminders sent</p>
                  </div>
                </div>

                <div className="mt-5 rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">S</span>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Sofia contributed</p>
                        <p className="text-xs text-slate-500">Confirmed by the pool admin</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold tabular-nums text-emerald-700">+$400</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-800 bg-slate-950 py-10 text-white" aria-label="Engineering project statistics">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-10 px-4 sm:px-6 lg:grid-cols-4 lg:px-8">
            {engineeringSignals.map((signal) => (
              <div key={signal.label}>
                <p className="text-3xl font-black tracking-tight tabular-nums text-white sm:text-4xl">{signal.value}</p>
                <p className="mt-1 text-sm font-semibold text-blue-300">{signal.label}</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">{signal.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-20 bg-slate-50 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700">The product</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">A clear workflow for a trust-based tradition.</h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Every member sees the same schedule, contribution state, payout order, and conversation history.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {productSteps.map((item) => (
                <Card key={item.step} className="border-slate-200 shadow-sm">
                  <CardContent className="p-6 sm:p-7">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-bold text-blue-700">{item.step}</span>
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                        <item.icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    </div>
                    <h3 className="mt-8 text-xl font-bold text-slate-950">{item.title}</h3>
                    <p className="mt-3 leading-7 text-slate-600">{item.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="scroll-mt-20 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700">Built beyond the happy path</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">Trust is a product feature.</h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                The system combines financial workflow clarity with the security and communication tools real groups need.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              {productFeatures.map((feature) => (
                <div key={feature.title} className="flex gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
                    <feature.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-slate-950">{feature.title}</h3>
                    <p className="mt-2 leading-7 text-slate-600">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-blue-700 py-20 text-white sm:py-24">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-8">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-200">Engineering case study</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">A production-shaped system, documented honestly.</h2>
              <p className="mt-5 max-w-xl text-lg leading-8 text-blue-100">
                Explore the domain model, security boundaries, payment-provider seam, testing strategy, and the tradeoffs behind the implementation.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/case-study"
                  className={cn(buttonVariants({ size: "lg" }), "gap-2 bg-white text-blue-800 hover:bg-blue-50")}
                >
                  View the case study
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href={repositoryUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(buttonVariants({ variant: "outline", size: "lg" }), "gap-2 border-blue-300 bg-transparent text-white hover:border-white hover:bg-blue-800 hover:text-white")}
                >
                  <Github className="h-4 w-4" aria-hidden="true" />
                  Inspect the source
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { icon: Layers3, title: "Layered architecture", text: "App Router UI, typed route handlers, service boundaries, and Mongoose models." },
                { icon: LockKeyhole, title: "Defense in depth", text: "MFA, authorization checks, validation, rate limits, headers, and audit events." },
                { icon: ShieldCheck, title: "Safe payment scope", text: "Manual methods by default; Stripe is isolated and test-mode-only by design." },
                { icon: Code2, title: "Automated confidence", text: "CI gates lint, types, Jest suites, and production builds; Playwright runs nightly." },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-blue-500 bg-blue-800/60 p-5">
                  <item.icon className="h-5 w-5 text-blue-200" aria-hidden="true" />
                  <h3 className="mt-4 font-bold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-blue-100">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 sm:py-24">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700">See it in context</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">Follow a complete savings round.</h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              The demo account is preloaded with members, confirmed contributions, discussion activity, and a completed payout—no signup required.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/auth/signin" className={cn(buttonVariants({ size: "lg" }), "gap-2 bg-blue-700 hover:bg-blue-800")}>Try the demo <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/help/documentation" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "border-slate-300")}>Browse documentation</Link>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
