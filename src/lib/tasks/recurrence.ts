import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  isAfter,
  isBefore,
  isEqual,
  startOfDay,
  subDays,
} from "date-fns";
import type { Recurrence, Task } from "@/types/models";
import { asDate } from "@/lib/date";

function lastFridayOfMonth(date: Date): Date {
  const monthEnd = endOfMonth(date);
  const daysBack = (monthEnd.getDay() - 5 + 7) % 7;
  return startOfDay(subDays(monthEnd, daysBack));
}

export function nextOccurrence(recurrence: Recurrence, after: Date): Date {
  const baseline = startOfDay(after);

  switch (recurrence.type) {
    case "daily":
      return addDays(baseline, Math.max(1, recurrence.interval));
    case "weekly":
      return addWeeks(baseline, Math.max(1, recurrence.interval));
    case "monthly":
      return addMonths(baseline, Math.max(1, recurrence.interval));
    case "weekdays": {
      for (let days = 1; days <= 7; days += 1) {
        const candidate = addDays(baseline, days);
        if (recurrence.weekdays.includes(candidate.getDay())) return candidate;
      }
      return addWeeks(baseline, 1);
    }
    case "last_friday_month": {
      const inThisMonth = lastFridayOfMonth(baseline);
      return isAfter(inThisMonth, baseline)
        ? inThisMonth
        : lastFridayOfMonth(addMonths(baseline, 1));
    }
  }
}

export function describeRecurrence(
  recurrence?: Recurrence,
): string | undefined {
  if (!recurrence) return undefined;
  switch (recurrence.type) {
    case "daily":
      return recurrence.interval === 1
        ? "Dagelijks"
        : `Elke ${recurrence.interval} dagen`;
    case "weekly":
      return recurrence.interval === 1
        ? "Wekelijks"
        : `Elke ${recurrence.interval} weken`;
    case "monthly":
      return recurrence.interval === 1
        ? "Maandelijks"
        : `Elke ${recurrence.interval} maanden`;
    case "weekdays": {
      const names = ["zo", "ma", "di", "wo", "do", "vr", "za"];
      return recurrence.weekdays.map((day) => names[day]).join(" en ");
    }
    case "last_friday_month":
      return "Laatste vrijdag van de maand";
  }
}

export function isTaskDueSoon(task: Task, now: Date, daysAhead = 7): boolean {
  const dueDate = asDate(task.dueDate);
  if (!dueDate || task.status === "done") return false;
  return (
    (isAfter(dueDate, now) || isEqual(dueDate, now)) &&
    isBefore(dueDate, addDays(now, daysAhead))
  );
}
