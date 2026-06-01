"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, LoadingScreen, Message } from "@/components/ui";
import { useAuth } from "@/contexts/auth-context";
import { useHousehold } from "@/contexts/household-context";

export default function CreateHouseholdPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { member, loading, createNewHousehold, retryLoading, error } =
    useHousehold();
  const [name, setName] = useState("Ons huis");
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string>();

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
    if (!loading && member) router.replace("/dashboard");
  }, [authLoading, loading, member, router, user]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setSubmitError(undefined);
    try {
      await createNewHousehold(name);
      router.replace("/dashboard");
    } catch {
      setSubmitError("Het huishouden kon niet worden aangemaakt.");
    } finally {
      setBusy(false);
    }
  }

  if (authLoading || loading || !user) return <LoadingScreen />;

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-5">
      <Card className="w-full p-6">
        <p className="eyebrow">Welkom bij HuisHub</p>
        <h1 className="mt-2 text-4xl leading-none">Maak je huishouden</h1>
        <p className="mt-3 text-sm uppercase tracking-[0.12em] text-muted">
          Daarna kun je je partner en meekijkers uitnodigen.
        </p>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <label>
            <span className="label">Naam van het huishouden</span>
            <input
              className="field"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          {(error || submitError) && (
            <div className="space-y-2">
              <Message>{submitError ?? error}</Message>
              {error && !submitError && (
                <Button
                  className="w-full"
                  onClick={retryLoading}
                  type="button"
                  variant="secondary"
                >
                  Opnieuw proberen
                </Button>
              )}
            </div>
          )}
          <Button className="w-full" disabled={busy} type="submit">
            {busy ? "Aanmaken..." : "Doorgaan"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
