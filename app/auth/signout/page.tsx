"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SignOut() {
  const router = useRouter();

  useEffect(() => {
    const handleSignOut = async () => {
      // Sign out and redirect to sign in page
      await signOut({ redirect: false });
      router.push("/auth/signin");
    };

    handleSignOut();
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">JS</span>
          </div>
          <span className="text-xl font-bold text-gray-900">Juntas Seguras</span>
        </div>
      </div>
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        <h2 className="mt-4 text-xl font-semibold text-gray-900">
          Signing out...
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          You are being signed out of your account
        </p>
      </div>
    </div>
  );
}