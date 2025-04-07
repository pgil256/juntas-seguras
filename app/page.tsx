// app/page.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Shield, Users, Wallet, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/" className="text-2xl font-bold text-blue-600">
                  Juntas Seguras
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/help">
                <Button variant="ghost">Help</Button>
              </Link>
              <Link href="/auth/signin">
                <Button variant="outline">Log in</Button>
              </Link>
              <Link href="/auth/signup">
                <Button>Sign up</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero section */}
      <div className="max-w-7xl mx-auto py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-2 lg:gap-8 items-center">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 sm:tracking-tight lg:text-5xl xl:text-6xl leading-tight">
              Secure community savings pools
            </h1>
            <p className="mt-4 sm:mt-5 text-lg sm:text-xl text-gray-500">
              Juntas Seguras helps you create and manage trusted savings pools
              with friends, family, and community members. Save together, build
              wealth, and achieve financial goals.
            </p>
            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
              <Button 
                size="lg" 
                onClick={() => router.push("/auth/signup")}
                className="w-full sm:w-auto justify-center text-base"
              >
                Get Started
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => router.push("/help/documentation")}
                className="w-full sm:w-auto justify-center text-base"
              >
                Learn More
              </Button>
            </div>
          </div>
          <div className="mt-8 sm:mt-10 lg:mt-0">
            <div className="rounded-lg shadow-xl overflow-hidden bg-gradient-to-b from-blue-50 to-white h-64 sm:h-80 md:h-96">
              <div className="relative w-full h-full flex items-center justify-center">
                <Image
                  src="/images/js-logo.png"
                  alt="Juntas Seguras platform"
                  width={600}
                  height={300}
                  className="w-[90%] h-auto transform scale-105 sm:scale-110"
                  priority
                  unoptimized
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features section */}
      <div className="bg-white py-10 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
              Why Choose Juntas Seguras
            </h2>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg text-gray-500 max-w-2xl mx-auto">
              Our platform offers a secure and transparent way to manage
              community savings pools.
            </p>
          </div>

          <div className="mt-8 sm:mt-10">
            <div className="grid grid-cols-1 gap-5 sm:gap-6 md:gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center">
                    <div className="p-3 bg-blue-100 rounded-full">
                      <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                    </div>
                    <h3 className="mt-4 text-base sm:text-lg font-medium text-gray-900">
                      Secure Transactions
                    </h3>
                    <p className="mt-2 text-center text-sm sm:text-base text-gray-500">
                      All transactions are secured with state-of-the-art
                      encryption and security protocols.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center">
                    <div className="p-3 bg-green-100 rounded-full">
                      <Users className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                    </div>
                    <h3 className="mt-4 text-base sm:text-lg font-medium text-gray-900">
                      Community Building
                    </h3>
                    <p className="mt-2 text-center text-sm sm:text-base text-gray-500">
                      Build financial resilience within your community through
                      trust and transparency.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center">
                    <div className="p-3 bg-purple-100 rounded-full">
                      <Wallet className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
                    </div>
                    <h3 className="mt-4 text-base sm:text-lg font-medium text-gray-900">
                      Flexible Pools
                    </h3>
                    <p className="mt-2 text-center text-sm sm:text-base text-gray-500">
                      Create pools with customizable terms to match your
                      community's needs and financial goals.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center">
                    <div className="p-3 bg-orange-100 rounded-full">
                      <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
                    </div>
                    <h3 className="mt-4 text-base sm:text-lg font-medium text-gray-900">
                      Transparent Process
                    </h3>
                    <p className="mt-2 text-center text-sm sm:text-base text-gray-500">
                      Everyone can see payment schedules, contribution history,
                      and upcoming payouts.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* CTA section */}
      <div className="bg-blue-600">
        <div className="max-w-7xl mx-auto py-10 sm:py-12 px-4 sm:px-6 lg:py-16 lg:px-8 flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white sm:text-4xl max-w-xl">
            <span className="block">Ready to get started?</span>
            <span className="block text-blue-200 mt-1">
              Create your first savings pool today.
            </span>
          </h2>
          <div className="mt-6 sm:mt-8 lg:mt-0 lg:flex-shrink-0 flex flex-col sm:flex-row gap-3 sm:gap-0">
            <div className="inline-flex rounded-md shadow w-full sm:w-auto">
              <Button
                size="lg"
                className="bg-white text-blue-600 hover:bg-blue-50 w-full sm:w-auto justify-center"
                onClick={() => router.push("/auth/signup")}
              >
                Sign up
              </Button>
            </div>
            <div className="sm:ml-3 inline-flex rounded-md shadow w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="bg-white/10 text-white border-white hover:bg-blue-700 w-full sm:w-auto justify-center"
                onClick={() => router.push("/auth/signin")}
              >
                Log in
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Simple Footer */}
      <footer className="bg-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500">
            &copy; 2025 Juntas Seguras. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
