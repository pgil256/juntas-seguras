"use client";

import { SessionProvider } from "next-auth/react";
import { NotificationProvider } from "../contexts/NotificationContext";
import { ReactNode } from "react";
import { usePathname } from "next/navigation";

interface ProvidersProps {
  children: ReactNode;
}

function ProvidersContent({ children }: ProvidersProps) {
  const pathname = usePathname();

  // Disable session polling on MFA and auth pages to prevent redirect loops
  const isMfaOrAuthPage = pathname?.startsWith('/mfa') || pathname?.startsWith('/auth');

  return (
    <SessionProvider
      refetchInterval={isMfaOrAuthPage ? 0 : 5 * 60}
      refetchOnWindowFocus={!isMfaOrAuthPage}
    >
      <NotificationProvider>
        {children}
      </NotificationProvider>
    </SessionProvider>
  );
}

export function Providers({ children }: ProvidersProps) {
  return <ProvidersContent>{children}</ProvidersContent>;
}