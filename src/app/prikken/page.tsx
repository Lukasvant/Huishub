"use client";

import { Suspense, useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import {
  Button,
  Card,
  EmptyState,
  LoadingScreen,
  Message,
} from "@/components/ui";
import { asDate, formatDay, formatTime } from "@/lib/date";
import {
  createPublicDatePollResponse,
  subscribePublicDatePoll,
} from "@/lib/firebase/date-polls";
import type { DatePollChoice, PublicDatePoll } from "@/types/models";

function DatePollPublicPageContent() {
  const searchParams = useSearchParams();
  const publicId = searchParams.get("p") ?? "";
  const [poll, setPoll] = useState<PublicDatePoll>();
  const [loadedPublicId, setLoadedPublicId] = useState("");
  const [error, setError] = useState<string>();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [choices, setChoices] = useState<Record<string, DatePollChoice>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!publicId) {
      return;
    }
    return subscribePublicDatePoll(
      publicId,
      (nextPoll) => {
        setPoll(nextPoll);
        setError(undefined);
        setLoadedPublicId(publicId);
      },
      () => {
        setPoll(undefined);
        setError("Deze datumprikker kon niet worden geladen.");
        setLoadedPublicId(publicId);
      },
    );
  }, [publicId]);

  const activePoll = loadedPublicId === publicId ? poll : undefined;
  const loading = Boolean(publicId && loadedPublicId !== publicId && !error);
  const slots = useMemo(() => activePoll?.candidateSlots ?? [], [activePoll]);

  function setChoice(slotId: string, choice: DatePollChoice) {
    setChoices((current) => ({ ...current, [slotId]: choice }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!publicId || !name.trim()) return;
    setBusy(true);
    setError(undefined);
    try {
      await createPublicDatePollResponse(publicId, {
        name,
        ...(email.trim() ? { email } : {}),
        choices,
      });
      setSubmitted(true);
    } catch {
      setError("Je reactie kon niet worden opgeslagen.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingScreen text="Datumprikker laden..." />;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl items-center px-5 py-8">
      <Card className="w-full p-5 sm:p-6">
        <p className="eyebrow">TaskHive Datumprikker</p>
        {!publicId ? (
          <EmptyState
            title="Geen link gevonden"
            text="Open de volledige link die je hebt ontvangen."
          />
        ) : error ? (
          <Message>{error}</Message>
        ) : !activePoll ? (
          <EmptyState
            title="Niet gevonden"
            text="Deze datumprikker bestaat niet of is verlopen."
          />
        ) : submitted ? (
          <EmptyState
            title="Dank je"
            text="Je reactie is opgeslagen. Lukas ziet welke momenten passen."
          />
        ) : (
          <>
            <h1 className="mt-2 text-4xl leading-none">{activePoll.title}</h1>
            {activePoll.description && (
              <p className="mt-2 text-sm text-muted">
                {activePoll.description}
              </p>
            )}
            {activePoll.location && (
              <p className="mt-1 text-sm text-muted">
                Locatie: {activePoll.location}
              </p>
            )}
            <p className="mt-3 text-sm text-muted">
              Kies per optie of je kunt. Je ziet geen agenda-informatie van
              iemand anders.
            </p>
            <form className="mt-5 space-y-4" onSubmit={submit}>
              <div className="grid gap-2 sm:grid-cols-2">
                <label>
                  <span className="label">Naam</span>
                  <input
                    className="field"
                    required
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </label>
                <label>
                  <span className="label">E-mail optioneel</span>
                  <input
                    className="field"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </label>
              </div>
              <div className="space-y-2">
                {slots.map((slot) => {
                  const start = asDate(slot.startDateTime);
                  const end = asDate(slot.endDateTime);
                  if (!start || !end) return null;
                  return (
                    <div
                      className="rounded-2xl border border-line bg-canvas p-3"
                      key={slot.id}
                    >
                      <p className="font-medium">
                        {formatDay(start)} · {formatTime(start)}-
                        {formatTime(end)}
                      </p>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {(
                          [
                            ["yes", "Kan"],
                            ["maybe", "Misschien"],
                            ["no", "Kan niet"],
                          ] as const
                        ).map(([value, label]) => (
                          <button
                            className={
                              choices[slot.id] === value
                                ? "rounded-full bg-sage-500 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white"
                                : "rounded-full border border-line px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
                            }
                            key={value}
                            type="button"
                            onClick={() => setChoice(slot.id, value)}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              {error && <Message>{error}</Message>}
              <Button className="w-full" disabled={busy} type="submit">
                {busy ? "Opslaan..." : "Reactie opslaan"}
              </Button>
            </form>
          </>
        )}
      </Card>
    </main>
  );
}

export default function DatePollPublicPage() {
  return (
    <Suspense fallback={<LoadingScreen text="Datumprikker laden..." />}>
      <DatePollPublicPageContent />
    </Suspense>
  );
}
