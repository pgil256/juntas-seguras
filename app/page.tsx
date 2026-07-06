// app/page.tsx - Landing page
"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Shield,
  Users,
  Wallet,
  CheckCircle,
  Menu,
  X,
  ArrowRight,
  TrendingUp,
  Lock,
  Globe,
  ChevronRight,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/" className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">JS</span>
                  </div>
                  <span className="text-xl font-bold text-gray-900">
                    Juntas Seguras
                  </span>
                </Link>
              </div>
            </div>
            {/* Desktop nav */}
            <div className="hidden sm:flex items-center space-x-2">
              <Link href="/help">
                <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
                  How it Works
                </Button>
              </Link>
              <Link href="/help/documentation">
                <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
                  Documentation
                </Button>
              </Link>
              <div className="w-px h-6 bg-gray-200 mx-2" />
              <Link href="/auth/signin">
                <Button variant="ghost" className="text-gray-700 font-medium">
                  Log in
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm">
                  Get Started
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
            {/* Mobile menu button */}
            <button
              type="button"
              className="sm:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="sr-only">
                {mobileMenuOpen ? "Close menu" : "Open menu"}
              </span>
              {mobileMenuOpen ? (
                <X className="block h-6 w-6" />
              ) : (
                <Menu className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>
        {/* Mobile menu */}
        <div className={`sm:hidden ${mobileMenuOpen ? "block" : "hidden"}`}>
          <div className="py-3 px-4 space-y-2 bg-white border-t border-gray-100">
            <Link
              href="/help"
              className="block"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Button variant="ghost" className="w-full justify-start">
                How it Works
              </Button>
            </Link>
            <Link
              href="/auth/signin"
              className="block"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Button variant="outline" className="w-full">
                Log in
              </Button>
            </Link>
            <Link
              href="/auth/signup"
              className="block"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Button className="w-full">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero section */}
      <section className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-full blur-3xl opacity-60" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-gradient-to-tl from-emerald-50 to-transparent rounded-full blur-3xl opacity-40" />
        </div>

        <div className="max-w-7xl mx-auto pt-16 sm:pt-24 pb-16 sm:pb-20 px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
            <div className="max-w-xl">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium mb-6">
                <Lock className="h-3.5 w-3.5" />
                Trusted by communities everywhere
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight leading-[1.1]">
                Save together,{" "}
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  build wealth
                </span>{" "}
                as a community
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-gray-500 leading-relaxed">
                Create secure, transparent savings pools with friends, family,
                and community members. Track contributions, manage payouts, and
                grow together.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link href="/auth/signup">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-base h-12 px-6 shadow-lg shadow-blue-600/25"
                  >
                    Start Your Pool
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/help/documentation">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto text-base h-12 px-6 border-gray-200"
                  >
                    See How it Works
                  </Button>
                </Link>
              </div>

              {/* Social proof */}
              <div className="mt-10 flex items-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-green-500" />
                  <span>Bank-grade security</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-500" />
                  <span>Venmo, PayPal, Zelle</span>
                </div>
              </div>
            </div>

            {/* Hero visual */}
            <div className="mt-12 lg:mt-0 hidden sm:block">
              <div className="relative">
                {/* Decorative cards behind main image */}
                <div className="absolute -top-4 -right-4 w-full h-full bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl transform rotate-2" />
                <div className="absolute -top-2 -right-2 w-full h-full bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl transform rotate-1" />

                {/* Main card */}
                <div className="relative bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-sm text-gray-500">Family Savings Pool</p>
                      <p className="text-2xl font-bold text-gray-900">$2,400.00</p>
                    </div>
                    <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-6">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-500">Round 3 of 6</span>
                      <span className="font-medium text-gray-700">50%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full w-1/2 transition-all" />
                    </div>
                  </div>

                  {/* Member avatars */}
                  <div className="flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {["bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-purple-500", "bg-cyan-500"].map(
                        (color, i) => (
                          <div
                            key={i}
                            className={`w-8 h-8 rounded-full ${color} border-2 border-white flex items-center justify-center text-white text-xs font-medium`}
                          >
                            {["M", "S", "J", "A", "R", "L"][i]}
                          </div>
                        )
                      )}
                    </div>
                    <span className="text-sm text-gray-500">6 members</span>
                  </div>

                  {/* Recent activity */}
                  <div className="mt-6 pt-6 border-t border-gray-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Maria paid</p>
                          <p className="text-xs text-gray-500">2 hours ago</p>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-green-600">+$400</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Sofia paid</p>
                          <p className="text-xs text-gray-500">5 hours ago</p>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-green-600">+$400</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works section */}
      <section className="py-16 sm:py-24 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              How Juntas Seguras Works
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Get your community savings pool running in three simple steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
            {[
              {
                step: "01",
                title: "Create Your Pool",
                description:
                  "Set up a new savings pool with your preferred contribution amount, frequency, and payout schedule.",
                icon: Wallet,
                color: "blue",
              },
              {
                step: "02",
                title: "Invite Members",
                description:
                  "Send invitations to trusted friends, family, or community members to join your pool.",
                icon: Users,
                color: "indigo",
              },
              {
                step: "03",
                title: "Track & Grow",
                description:
                  "Everyone contributes on schedule. Track payments, manage rounds, and watch your savings grow.",
                icon: TrendingUp,
                color: "emerald",
              },
            ].map((item) => (
              <div key={item.step} className="relative">
                <div className="text-6xl font-extrabold text-gray-500 mb-4">
                  {item.step}
                </div>
                <div
                  className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 ${
                    item.color === "blue"
                      ? "bg-blue-100 text-blue-600"
                      : item.color === "indigo"
                      ? "bg-indigo-100 text-indigo-600"
                      : "bg-emerald-100 text-emerald-600"
                  }`}
                >
                  <item.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-gray-500 leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features section */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Built for Trust & Transparency
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Every feature is designed to keep your community&apos;s money safe
              and your pool running smoothly.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Shield,
                title: "End-to-End Security",
                description:
                  "Multi-factor authentication, identity verification, and comprehensive audit logging protect every transaction.",
                gradient: "from-blue-500 to-blue-600",
                bg: "bg-blue-50",
              },
              {
                icon: Users,
                title: "Member Management",
                description:
                  "Invite members, set roles, track contributions, and send reminders to keep everyone on schedule.",
                gradient: "from-emerald-500 to-emerald-600",
                bg: "bg-emerald-50",
              },
              {
                icon: Wallet,
                title: "Flexible Payments",
                description:
                  "Support for Venmo, PayPal, Zelle, and Cash App. Generate QR codes and payment deep links.",
                gradient: "from-purple-500 to-purple-600",
                bg: "bg-purple-50",
              },
              {
                icon: CheckCircle,
                title: "Full Transparency",
                description:
                  "Real-time dashboards show payment schedules, contribution history, analytics, and upcoming payouts.",
                gradient: "from-amber-500 to-amber-600",
                bg: "bg-amber-50",
              },
            ].map((feature) => (
              <Card
                key={feature.title}
                className="group border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1"
              >
                <CardContent className="pt-6 pb-6">
                  <div
                    className={`inline-flex items-center justify-center w-11 h-11 rounded-lg ${feature.bg} mb-4`}
                  >
                    <feature.icon
                      className={`h-5 w-5 bg-gradient-to-br ${feature.gradient} bg-clip-text`}
                      style={{
                        color:
                          feature.gradient.includes("blue")
                            ? "#3b82f6"
                            : feature.gradient.includes("emerald")
                            ? "#10b981"
                            : feature.gradient.includes("purple")
                            ? "#8b5cf6"
                            : "#f59e0b",
                      }}
                    />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats section */}
      <section className="py-16 sm:py-20 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { label: "Payment Methods", value: "4+", detail: "Venmo, PayPal, Zelle, Cash App" },
              { label: "Security Layers", value: "MFA", detail: "Multi-factor authentication" },
              { label: "API Endpoints", value: "60", detail: "Full-featured REST API" },
              { label: "Uptime", value: "99.9%", detail: "Hosted on Vercel" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="mt-1 text-sm font-medium text-gray-300">
                  {stat.label}
                </div>
                <div className="mt-0.5 text-xs text-gray-300">{stat.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Ready to start saving together?
          </h2>
          <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
            Join communities who trust Juntas Seguras to manage their savings
            pools securely and transparently.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/auth/signup">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-base h-12 px-8 shadow-lg shadow-blue-600/25"
              >
                Create Your Pool
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/auth/signin">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto text-base h-12 px-8 border-gray-200"
              >
                Sign In
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center">
                <span className="text-white font-bold text-xs">JS</span>
              </div>
              <span className="text-sm font-medium text-gray-900">
                Juntas Seguras
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <Link href="/help" className="hover:text-gray-700 transition-colors">
                Help
              </Link>
              <Link href="/privacy" className="hover:text-gray-700 transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-gray-700 transition-colors">
                Terms
              </Link>
            </div>
            <p className="text-sm text-gray-600">
              &copy; 2026 Juntas Seguras
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
