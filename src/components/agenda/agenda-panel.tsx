"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { addDays, isAfter, isBefore, isSameDay, startOfDay } from "date-fns";
import { useState, type FormEvent } from "react";
import clsx from "clsx";
import { Button, Card, EmptyState, Message } from "@/components/ui";
import { asDate, dateTimeInputValue, formatDay, formatTime } from "@/lib/date";
import type { NewAgendaInput } from "@/lib/firebase/data";
import { visibleAgendaItems } from "@/lib/permissions";
import type {
  AgendaItem,
  HouseholdMember,
  HouseholdRole,
} from "@/types/models";

interface AgendaPanelProps {
  items: AgendaItem[];
  role: HouseholdRole;
  canEdit: boolean;
  onCreate: (input: NewAgendaInput) => Promise<void>;
  onUpdate: (itemId: string, input: NewAgendaInput) => Promise<void>;
  onDelete: (itemId: string) => Promise<void>;
}

type AgendaView = "list" | "day" | "week";

export function AgendaPanel({
  items,
  role,
  canEdit,
  onCreate,
  onUpdate,
  onDelete,
}: AgendaPanelProps) {
  const [view, setView] = useState<AgendaView>("list");
  const [editing, setEditing] = useState<AgendaItem>();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDateTime, setStartDateTime] = useState("");
  const [endDateTime, setEndDateTime] = useState("");
  const [location, setLocation] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [privateItem, setPrivateItem] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const now = new Date();

  const allowedItems = visibleAgendaItems(
    { role } as Pick<HouseholdMember, "role">,
    items,
  );
  const displayedItems = allowedItems
    .filter((item) => {
      const startsAt = asDate(item.startDateTime);
      if (!startsAt) return false;
      if (view === "day") return isSameDay(startsAt, now);
      if (view === "week") {
        return (
          !isBefore(startsAt, startOfDay(now)) &&
          isBefore(startsAt, addDays(startOfDay(now), 7))
        );
      }
      return isAfter(startsAt, addDays(startOfDay(now), -1));
    })
    .sort(
      (left, right) =>
        asDate(left.startDateTime)!.getTime() -
        asDate(right.startDateTime)!.getTime(),
    );

  function reset() {
    setEditing(undefined);
    setTitle("");
    setDescription("");
    setStartDateTime("");
    setEndDateTime("");
    setLocation("");
    setAllDay(false);
    setPrivateItem(false);
  }

  function edit(item: AgendaItem) {
    setEditing(item);
    setTitle(item.title);
    setDescription(item.description ?? "");
    setStartDateTime(dateTimeInputValue(asDate(item.startDateTime)));
    setEndDateTime(dateTimeInputValue(asDate(item.endDateTime)));
    setLocation(item.location ?? "");
    setAllDay(item.allDay);
    setPrivateItem(item.private);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(undefined);
    if (!startDateTime) {
      setError("Kies een datum en tijd.");
      return;
    }
    const input: NewAgendaInput = {
      title,
      description: description.trim() || undefined,
      startDateTime: new Date(startDateTime),
      endDateTime: endDateTime ? new Date(endDateTime) : undefined,
      location: location.trim() || undefined,
      allDay,
      private: privateItem,
    };
    setBusy(true);
    try {
      if (editing) await onUpdate(editing.id, input);
      else await onCreate(input);
      reset();
    } catch {
      setError("Deze afspraak kon niet worden opgeslagen.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(itemId: string) {
    setError(undefined);
    try {
      await onDelete(itemId);
    } catch {
      setError("De afspraak kon niet worden verwijderd.");
    }
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[22rem_1fr]">
      {canEdit && (
        <Card id="nieuw">
          <h2 className="font-semibold">
            {editing ? "Afspraak bewerken" : "Afspraak toevoegen"}
          </h2>
          <form className="mt-4 space-y-3" onSubmit={submit}>
            <label>
              <span className="label">Titel</span>
              <input
                aria-label="Titel"
                className="field"
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <label>
              <span className="label">Start</span>
              <input
                className="field"
                required
                type="datetime-local"
                value={startDateTime}
                onChange={(event) => setStartDateTime(event.target.value)}
              />
            </label>
            <label>
              <span className="label">Einde (optioneel)</span>
              <input
                className="field"
                type="datetime-local"
                value={endDateTime}
                onChange={(event) => setEndDateTime(event.target.value)}
              />
            </label>
            <label>
              <span className="label">Locatie (optioneel)</span>
              <input
                className="field"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
              />
            </label>
            <label>
              <span className="label">Notitie (optioneel)</span>
              <textarea
                className="field resize-none"
                rows={2}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                checked={allDay}
                type="checkbox"
                onChange={(event) => setAllDay(event.target.checked)}
              />
              Hele dag
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                checked={privateItem}
                type="checkbox"
                onChange={(event) => setPrivateItem(event.target.checked)}
              />
              Privé (volledig verborgen voor meekijkers)
            </label>
            {error && <Message>{error}</Message>}
            <div className="flex gap-2">
              <Button className="flex-1" disabled={busy} type="submit">
                <Plus className="h-4 w-4" />
                {editing ? "Opslaan" : "Toevoegen"}
              </Button>
              {editing && (
                <Button type="button" variant="secondary" onClick={reset}>
                  Annuleer
                </Button>
              )}
            </div>
          </form>
        </Card>
      )}
      <section>
        <div className="mb-4 flex rounded-xl bg-stone-100 p-1">
          {(
            [
              ["list", "Lijst"],
              ["day", "Vandaag"],
              ["week", "Week"],
            ] as const
          ).map(([value, label]) => (
            <button
              className={clsx(
                "flex-1 rounded-lg px-3 py-2 text-sm transition",
                view === value
                  ? "bg-white font-medium text-ink shadow-sm"
                  : "text-muted",
              )}
              key={value}
              onClick={() => setView(value)}
            >
              {label}
            </button>
          ))}
        </div>
        {displayedItems.length === 0 ? (
          <EmptyState
            title="Niets gepland"
            text="Op dit moment zijn er geen afspraken in deze weergave."
          />
        ) : (
          <div className="space-y-3">
            {displayedItems.map((item) => {
              const startsAt = asDate(item.startDateTime)!;
              return (
                <Card key={item.id}>
                  <div className="flex gap-3">
                    <div className="w-16 shrink-0 text-sm text-muted">
                      <p>{formatDay(startsAt)}</p>
                      {!item.allDay && <p>{formatTime(startsAt)}</p>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{item.title}</p>
                        {canEdit && item.private && (
                          <span className="rounded-full bg-warm px-2 py-0.5 text-xs">
                            Privé
                          </span>
                        )}
                      </div>
                      {item.location && (
                        <p className="mt-1 text-sm text-muted">
                          {item.location}
                        </p>
                      )}
                      {item.description && (
                        <p className="mt-1 text-sm text-muted">
                          {item.description}
                        </p>
                      )}
                    </div>
                    {canEdit && (
                      <div className="flex">
                        <Button
                          aria-label="Bewerk afspraak"
                          className="px-2"
                          variant="ghost"
                          onClick={() => edit(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          aria-label="Verwijder afspraak"
                          className="px-2"
                          variant="ghost"
                          onClick={() => {
                            if (window.confirm("Deze afspraak verwijderen?")) {
                              void remove(item.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
