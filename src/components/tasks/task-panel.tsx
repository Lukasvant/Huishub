"use client";

import { Check, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button, Card, EmptyState, Message } from "@/components/ui";
import { asDate, dateInputValue, formatDay } from "@/lib/date";
import { describeRecurrence } from "@/lib/tasks/recurrence";
import type { NewTaskInput } from "@/lib/firebase/data";
import type {
  HouseholdMember,
  Recurrence,
  Task,
  TaskCategory,
} from "@/types/models";

interface TaskPanelProps {
  tasks: Task[];
  members: HouseholdMember[];
  canEdit: boolean;
  onCreate: (input: NewTaskInput) => Promise<void>;
  onUpdate: (taskId: string, input: NewTaskInput) => Promise<void>;
  onToggle: (task: Task) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
}

const categories: Array<{ value: TaskCategory; label: string }> = [
  { value: "huishouden", label: "Huishouden" },
  { value: "kind", label: "Kind" },
  { value: "administratie", label: "Administratie" },
  { value: "boodschappen", label: "Boodschappen" },
  { value: "overig", label: "Overig" },
];
const weekdayNames = [
  { value: 1, label: "Ma" },
  { value: 2, label: "Di" },
  { value: 3, label: "Wo" },
  { value: 4, label: "Do" },
  { value: 5, label: "Vr" },
  { value: 6, label: "Za" },
  { value: 0, label: "Zo" },
];

export function TaskPanel({
  tasks,
  members,
  canEdit,
  onCreate,
  onUpdate,
  onToggle,
  onDelete,
}: TaskPanelProps) {
  const [editing, setEditing] = useState<Task>();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [category, setCategory] = useState<TaskCategory>("huishouden");
  const [visibleToViewers, setVisibleToViewers] = useState(true);
  const [recurrenceType, setRecurrenceType] = useState<
    Recurrence["type"] | "none"
  >("none");
  const [interval, setInterval] = useState(1);
  const [weekdays, setWeekdays] = useState<number[]>([1]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const ordered = [...tasks].sort((left, right) => {
    if (left.status !== right.status) return left.status === "open" ? -1 : 1;
    return (
      (asDate(left.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER) -
      (asDate(right.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER)
    );
  });

  function resetForm() {
    setEditing(undefined);
    setTitle("");
    setDescription("");
    setAssignedTo("");
    setDueDate("");
    setCategory("huishouden");
    setVisibleToViewers(true);
    setRecurrenceType("none");
    setInterval(1);
    setWeekdays([1]);
  }

  function edit(task: Task) {
    setEditing(task);
    setTitle(task.title);
    setDescription(task.description ?? "");
    setAssignedTo(task.assignedTo ?? "");
    setDueDate(dateInputValue(asDate(task.dueDate)));
    setCategory(task.category);
    setVisibleToViewers(task.visibleToViewers);
    setRecurrenceType(task.recurrence?.type ?? "none");
    setInterval(
      task.recurrence && "interval" in task.recurrence
        ? task.recurrence.interval
        : 1,
    );
    setWeekdays(
      task.recurrence?.type === "weekdays" ? task.recurrence.weekdays : [1],
    );
  }

  function recurrence(): Recurrence | undefined {
    switch (recurrenceType) {
      case "daily":
      case "weekly":
      case "monthly":
        return { type: recurrenceType, interval: Math.max(1, interval) };
      case "weekdays":
        return { type: "weekdays", weekdays };
      case "last_friday_month":
        return { type: "last_friday_month" };
      case "none":
        return undefined;
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    setError(undefined);
    if (recurrenceType === "weekdays" && weekdays.length === 0) {
      setError("Kies minimaal één weekdag.");
      return;
    }
    setBusy(true);
    const input: NewTaskInput = {
      title,
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(assignedTo ? { assignedTo } : {}),
      ...(dueDate ? { dueDate: new Date(`${dueDate}T12:00:00`) } : {}),
      category,
      ...(recurrence() ? { recurrence: recurrence() } : {}),
      visibleToViewers,
    };
    try {
      if (editing) await onUpdate(editing.id, input);
      else await onCreate(input);
      resetForm();
    } catch {
      setError("De taak kon niet worden opgeslagen.");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(task: Task) {
    setError(undefined);
    try {
      await onToggle(task);
    } catch {
      setError("De taak kon niet worden bijgewerkt.");
    }
  }

  async function remove(taskId: string) {
    setError(undefined);
    try {
      await onDelete(taskId);
    } catch {
      setError("De taak kon niet worden verwijderd.");
    }
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[22rem_1fr]">
      {canEdit && (
        <Card id="nieuw">
          <h2 className="font-semibold">
            {editing ? "Taak bewerken" : "Nieuwe taak"}
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
              <span className="label">Omschrijving (optioneel)</span>
              <textarea
                className="field resize-none"
                rows={2}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label>
                <span className="label">Voor wie</span>
                <select
                  className="field"
                  value={assignedTo}
                  onChange={(event) => setAssignedTo(event.target.value)}
                >
                  <option value="">Iedereen</option>
                  {members.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.displayName || member.email}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="label">Deadline</span>
                <input
                  className="field"
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                />
              </label>
            </div>
            <label>
              <span className="label">Categorie</span>
              <select
                className="field"
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as TaskCategory)
                }
              >
                {categories.map((entry) => (
                  <option key={entry.value} value={entry.value}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="label">Herhaling</span>
              <select
                className="field"
                value={recurrenceType}
                onChange={(event) =>
                  setRecurrenceType(
                    event.target.value as Recurrence["type"] | "none",
                  )
                }
              >
                <option value="none">Geen</option>
                <option value="daily">Dagelijks / elke X dagen</option>
                <option value="weekly">Wekelijks / elke X weken</option>
                <option value="monthly">Maandelijks / elke X maanden</option>
                <option value="weekdays">Vaste weekdagen</option>
                <option value="last_friday_month">
                  Laatste vrijdag van de maand
                </option>
              </select>
            </label>
            {["daily", "weekly", "monthly"].includes(recurrenceType) && (
              <label>
                <span className="label">Elke hoeveel?</span>
                <input
                  className="field"
                  min={1}
                  type="number"
                  value={interval}
                  onChange={(event) => setInterval(Number(event.target.value))}
                />
              </label>
            )}
            {recurrenceType === "weekdays" && (
              <fieldset>
                <legend className="label">Dagen</legend>
                <div className="flex flex-wrap gap-2">
                  {weekdayNames.map((day) => (
                    <label
                      className="rounded-full bg-warm px-3 py-2 text-sm"
                      key={day.value}
                    >
                      <input
                        className="mr-1"
                        checked={weekdays.includes(day.value)}
                        type="checkbox"
                        onChange={(event) =>
                          setWeekdays((current) =>
                            event.target.checked
                              ? [...current, day.value]
                              : current.filter((value) => value !== day.value),
                          )
                        }
                      />
                      {day.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input
                checked={visibleToViewers}
                type="checkbox"
                onChange={(event) => setVisibleToViewers(event.target.checked)}
              />
              Zichtbaar voor oppas en familie
            </label>
            {error && <Message>{error}</Message>}
            <div className="flex gap-2">
              <Button className="flex-1" disabled={busy} type="submit">
                <Plus className="h-4 w-4" />
                {editing ? "Opslaan" : "Toevoegen"}
              </Button>
              {editing && (
                <Button variant="secondary" type="button" onClick={resetForm}>
                  Annuleer
                </Button>
              )}
            </div>
          </form>
        </Card>
      )}
      <div className="space-y-3">
        {ordered.length === 0 ? (
          <EmptyState
            title="Geen open taken"
            text={
              canEdit
                ? "Voeg een taak toe wanneer er iets moet gebeuren."
                : "Er zijn geen zichtbare taken."
            }
          />
        ) : (
          ordered.map((task) => {
            const assigned = members.find(
              (member) => member.userId === task.assignedTo,
            );
            return (
              <Card
                className={task.status === "done" ? "opacity-60" : undefined}
                key={task.id}
              >
                <div className="flex items-start gap-3">
                  {canEdit && (
                    <button
                      aria-label={`${task.title} afronden`}
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-stone-300"
                      onClick={() => void toggle(task)}
                    >
                      {task.status === "done" ? (
                        <RotateCcw className="h-4 w-4" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </button>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{task.title}</p>
                    {task.description && (
                      <p className="mt-1 text-sm text-muted">
                        {task.description}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted">
                      {asDate(task.dueDate) && (
                        <span className="rounded-full bg-warm px-2 py-1">
                          {formatDay(asDate(task.dueDate)!)}
                        </span>
                      )}
                      {describeRecurrence(task.recurrence) && (
                        <span className="rounded-full bg-sage-50 px-2 py-1 text-sage-600">
                          {describeRecurrence(task.recurrence)}
                        </span>
                      )}
                      {assigned && (
                        <span className="rounded-full bg-warm px-2 py-1">
                          {assigned.displayName || assigned.email}
                        </span>
                      )}
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex">
                      <Button
                        aria-label="Bewerk taak"
                        className="px-2"
                        variant="ghost"
                        onClick={() => edit(task)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        aria-label="Verwijder taak"
                        className="px-2"
                        variant="ghost"
                        onClick={() => {
                          if (window.confirm("Deze taak verwijderen?")) {
                            void remove(task.id);
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
          })
        )}
      </div>
    </div>
  );
}
