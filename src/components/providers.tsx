"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/contexts/auth-context";
import { HouseholdProvider } from "@/contexts/household-context";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <HouseholdProvider>{children}</HouseholdProvider>
    </AuthProvider>
  );
}
