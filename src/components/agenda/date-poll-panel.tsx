"use client";

import { addDays } from "date-fns";
import { CalendarCheck, LinkIcon, Wand2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import type { User } from "firebase/auth";
import { Button, Card, Message } from "@/components/ui";
import { suggestDatePollSlots } from "@/lib/agenda/date-poll-planner";
import { dateInputValue, formatDay, formatTime } from "@/lib/date";
import { createDatePoll } from "@/lib/firebase/date-polls";
import {
  queryGoogleFreeBusy,
  requestGoogleCalendarAccess,
} from "@/lib/google-calendar/client";
import type { AgendaItem, DatePollSlot } from "@/types/models";

const weekdayOptions = [
  { value: 1, label: "Ma" },
  { value: 2, label: "Di" },
  { value: 3, label: "Wo" },
  { value: 4, label: "Do" },
  { value: 5, label: "Vr" },
  { value: 6, label: "Za" },
  { value: 0, label: "Zo" },
];

export function DatePollPanel({
  agendaItems,
  canEdit,
  householdId,
  user,
}: {
  agendaItems: AgendaItem[];
  canEdit: boolean;
  householdId: string;
  user: User | null;
}) {
  const [title, setTitle] = useState("Afspreken");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [rangeStart, setRangeStart] = useState(dateInputValue(new Date()));
  const [rangeEnd, setRangeEnd] = useState(
    dateInputValue(addDays(new Date(), 28)),
  );
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [allowedWeekdays, setAllowedWeekdays] = useState<number[]>([5, 6, 0]);
  const [allowedStartHour, setAllowedStartHour] = useState(18);
  const [allowedEndHour, setAllowedEndHour] = useState(22);
  const [googleAccessToken, setGoogleAccessToken] = useState<string>();
  const [suggestions, setSuggestions] = useState<DatePollSlot[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [shareLink, setShareLink] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  const selectedSlots = useMemo(
    () => suggestions.filter((slot) => selectedIds.includes(slot.id)),
    [selectedIds, suggestions],
  );

  if (!canEdit) return null;

  async function connectGoogle() {
    if (!user) return;
    setBusy(true);
    setError(undefined);
    setMessage(undefined);
    try {
      const connection = await requestGoogleCalendarAccess(user);
      setGoogleAccessToken(connection.accessToken);
      setMessage(
        "Google Agenda is gekoppeld voor deze sessie. TaskHive leest alleen vrij/bezet.",
      );
    } catch {
      setError(
        "Google Agenda koppelen lukte niet. Controleer later ook of de Calendar API aan staat in Google Cloud.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function generateSuggestions(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    setMessage(undefined);
    setShareLink(undefined);
    try {
      const start = new Date(`${rangeStart}T00:00:00`);
      const end = new Date(`${rangeEnd}T23:59:00`);
      const googleBusy = googleAccessToken
        ? await queryGoogleFreeBusy({
            accessToken: googleAccessToken,
            timeMin: start,
            timeMax: end,
          })
        : [];
      const nextSuggestions = suggestDatePollSlots({
        rangeStart: start,
        rangeEnd: end,
        durationMinutes,
        allowedWeekdays,
        allowedStartHour,
        allowedEndHour,
        busyBlocks: googleBusy,
        agendaItems,
      });
      setSuggestions(nextSuggestions);
      setSelectedIds(nextSuggestions.slice(0, 5).map((slot) => slot.id));
      setMessage(
        googleAccessToken
          ? "Opties gemaakt met Google Agenda en TaskHive-agenda."
          : "Opties gemaakt met alleen de TaskHive-agenda. Koppel Google voor een completer beeld.",
      );
    } catch {
      setError("Vrije momenten ophalen lukte niet.");
    } finally {
      setBusy(false);
    }
  }

  async function createPoll() {
    if (!user || selectedSlots.length === 0) return;
    setBusy(true);
    setError(undefined);
    try {
      const { publicId } = await createDatePoll(householdId, user.uid, {
        title,
        description,
        location,
        durationMinutes,
        rangeStart: new Date(`${rangeStart}T00:00:00`),
        rangeEnd: new Date(`${rangeEnd}T23:59:00`),
        candidateSlots: selectedSlots,
      });
      const url = new URL("/prikken", window.location.origin);
      url.searchParams.set("p", publicId);
      setShareLink(url.toString());
      setMessage("Deelbare link is klaar.");
    } catch {
      setError("Datumprikker maken lukte niet.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Nieuw</p>
          <h2 className="mt-1 font-semibold">Datum prikken</h2>
          <p className="mt-1 text-sm text-muted">
            Maak een link voor vrienden. Zij zien alleen opties, nooit jouw
            agenda.
          </p>
        </div>
        <Button
          disabled={busy || !user}
          type="button"
          variant="secondary"
          onClick={connectGoogle}
        >
          <CalendarCheck className="h-4 w-4" />
          Google
        </Button>
      </div>
      <form
        className="mt-4 grid gap-3 md:grid-cols-2"
        onSubmit={generateSuggestions}
      >
        <label className="md:col-span-2">
          <span className="label">Titel</span>
          <input
            className="field"
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label>
          <span className="label">Vanaf</span>
          <input
            className="field"
            required
            type="date"
            value={rangeStart}
            onChange={(event) => setRangeStart(event.target.value)}
          />
        </label>
        <label>
          <span className="label">Tot en met</span>
          <input
            className="field"
            required
            type="date"
            value={rangeEnd}
            onChange={(event) => setRangeEnd(event.target.value)}
          />
        </label>
        <label>
          <span className="label">Duur in minuten</span>
          <input
            className="field"
            min={30}
            step={30}
            type="number"
            value={durationMinutes}
            onChange={(event) => setDurationMinutes(Number(event.target.value))}
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label>
            <span className="label">Vanaf uur</span>
            <input
              className="field"
              max={23}
              min={0}
              type="number"
              value={allowedStartHour}
              onChange={(event) =>
                setAllowedStartHour(Number(event.target.value))
              }
            />
          </label>
          <label>
            <span className="label">Tot uur</span>
            <input
              className="field"
              max={24}
              min={1}
              type="number"
              value={allowedEndHour}
              onChange={(event) =>
                setAllowedEndHour(Number(event.target.value))
              }
            />
          </label>
        </div>
        <label>
          <span className="label">Locatie optioneel</span>
          <input
            className="field"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
          />
        </label>
        <label>
          <span className="label">Notitie optioneel</span>
          <input
            className="field"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <fieldset className="md:col-span-2">
          <legend className="label">Dagen</legend>
          <div className="flex flex-wrap gap-2">
            {weekdayOptions.map((weekday) => (
              <label
                className="rounded-full bg-warm px-3 py-2 text-sm"
                key={weekday.value}
              >
                <input
                  checked={allowedWeekdays.includes(weekday.value)}
                  className="mr-1"
                  type="checkbox"
                  onChange={(event) =>
                    setAllowedWeekdays((current) =>
                      event.target.checked
                        ? [...current, weekday.value]
                        : current.filter((value) => value !== weekday.value),
                    )
                  }
                />
                {weekday.label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="md:col-span-2">
          <Button disabled={busy || allowedWeekdays.length === 0} type="submit">
            <Wand2 className="h-4 w-4" />
            Vrije opties maken
          </Button>
        </div>
      </form>
      {(error || message) && (
        <div className="mt-3">
          {error ? (
            <Message>{error}</Message>
          ) : (
            <Message tone="info">{message}</Message>
          )}
        </div>
      )}
      {suggestions.length > 0 && (
        <div className="mt-4 border-t border-line pt-4">
          <h3 className="font-semibold">Kies opties om te delen</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {suggestions.map((slot) => {
              const start = slot.startDateTime as Date;
              const end = slot.endDateTime as Date;
              return (
                <label
                  className="rounded-2xl border border-line bg-canvas p-3 text-sm"
                  key={slot.id}
                >
                  <input
                    checked={selectedIds.includes(slot.id)}
                    className="mr-2"
                    type="checkbox"
                    onChange={(event) =>
                      setSelectedIds((current) =>
                        event.target.checked
                          ? [...current, slot.id]
                          : current.filter((id) => id !== slot.id),
                      )
                    }
                  />
                  <span className="font-medium">{formatDay(start)}</span>
                  <span className="text-muted">
                    {" "}
                    {formatTime(start)}-{formatTime(end)}
                  </span>
                </label>
              );
            })}
          </div>
          <Button
            className="mt-3"
            disabled={busy || selectedSlots.length === 0}
            type="button"
            onClick={createPoll}
          >
            <LinkIcon className="h-4 w-4" />
            Link maken
          </Button>
        </div>
      )}
      {shareLink && (
        <div className="mt-4 rounded-2xl bg-sage-50 p-3">
          <p className="text-sm font-medium">Deel deze link:</p>
          <input className="field mt-2" readOnly value={shareLink} />
        </div>
      )}
    </Card>
  );
}
