"use client";

import { SessionProvider } from "next-auth/react";
import { NotificationProvider } from "../contexts/NotificationContext";
import { ReactNode } from "react";
import MfaVerificationHandler from "../components/MfaVerificationHandler";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <NotificationProvider>
        {children}
        <MfaVerificationHandler />
      </NotificationProvider>
    </SessionProvider>
  );
}