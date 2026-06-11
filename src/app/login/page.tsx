"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Message } from "@/components/ui";
import { useAuth } from "@/contexts/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const {
    user,
    loading,
    configured,
    error,
    clearError,
    login,
    register,
    loginWithGoogle,
  } = useAuth();
  const [newAccount, setNewAccount] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, router, user]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (newAccount) {
        await register(name, email, password);
      } else {
        await login(email, password);
      }
      router.replace("/dashboard");
    } catch {
      // AuthProvider supplies the friendly Dutch error.
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-5 py-8">
      <div className="w-full">
        <div className="mb-8 text-center">
          <p className="eyebrow">Welkom bij</p>
          <h1 className="mt-2 font-serif text-6xl italic leading-none">
            Task<span className="not-italic text-sage-500">Hive</span>.
          </h1>
          <p className="mt-3 text-sm uppercase tracking-[0.14em] text-muted">
            Samen overzicht in huis, zonder gedoe.
          </p>
        </div>
        <Card className="p-5 sm:p-6">
          <h2 className="text-3xl leading-none">
            {newAccount ? "Account maken" : "Inloggen"}
          </h2>
          <form className="mt-5 space-y-4" onSubmit={submit}>
            {newAccount && (
              <label>
                <span className="label">Naam</span>
                <input
                  className="field"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                />
              </label>
            )}
            <label>
              <span className="label">E-mailadres</span>
              <input
                className="field"
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
            </label>
            <label>
              <span className="label">Wachtwoord</span>
              <input
                className="field"
                required
                minLength={6}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={newAccount ? "new-password" : "current-password"}
              />
            </label>
            {error && <Message>{error}</Message>}
            {!configured && (
              <Message tone="info">
                Configureer Firebase in <code>.env.local</code> om in te loggen.
              </Message>
            )}
            <Button
              className="w-full"
              type="submit"
              disabled={busy || !configured}
            >
              {busy
                ? "Even geduld..."
                : newAccount
                  ? "Account maken"
                  : "Inloggen"}
            </Button>
          </form>
          <Button
            variant="secondary"
            className="mt-3 w-full"
            disabled={busy || !configured}
            onClick={async () => {
              setBusy(true);
              try {
                await loginWithGoogle();
                router.replace("/dashboard");
              } catch {
                // AuthProvider supplies the friendly Dutch error.
              } finally {
                setBusy(false);
              }
            }}
          >
            Doorgaan met Google
          </Button>
          <button
            className="mt-5 w-full text-sm font-semibold text-sage-600"
            onClick={() => {
              clearError();
              setNewAccount((current) => !current);
            }}
          >
            {newAccount
              ? "Ik heb al een account"
              : "Nieuw hier? Maak een account"}
          </button>
        </Card>
      </div>
    </main>
  );
}
