"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/contexts/auth-context";
import { HouseholdProvider } from "@/contexts/household-context";
import { PushMessageListener } from "@/components/push-message-listener";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <PushMessageListener />
      <HouseholdProvider>{children}</HouseholdProvider>
    </AuthProvider>
  );
}
