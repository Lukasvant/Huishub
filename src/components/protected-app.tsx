"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { AppChrome } from "@/components/app-chrome";
import { LoadingScreen, Message } from "@/components/ui";
import { useAuth } from "@/contexts/auth-context";
import { useHousehold } from "@/contexts/household-context";

export function ProtectedApp({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, loading: authLoading, configured } = useAuth();
  const { member, loading: householdLoading, error } = useHousehold();

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
    if (!authLoading && user && !householdLoading && !member) {
      router.replace("/onboarding/create-household");
    }
  }, [authLoading, householdLoading, member, router, user]);

  if (!configured) {
    return (
      <main className="mx-auto max-w-lg px-5 py-16">
        <Message tone="info">
          Firebase is nog niet ingesteld. Voeg de variabelen uit{" "}
          <code>.env.example</code> toe aan <code>.env.local</code>.
        </Message>
      </main>
    );
  }
  if (authLoading || householdLoading || !user || !member) {
    return <LoadingScreen text="TaskHive openen..." />;
  }
  return (
    <AppChrome>
      {error && <Message>{error}</Message>}
      {children}
    </AppChrome>
  );
}
