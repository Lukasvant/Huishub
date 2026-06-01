import { addHours, isAfter, isBefore } from "date-fns";
import { asDate, formatDay, formatTime } from "@/lib/date";
import type { AgendaItem, InAppNotification, Task } from "@/types/models";

export function buildInAppNotifications(
  tasks: Task[],
  agendaItems: AgendaItem[],
  now = new Date(),
): InAppNotification[] {
  const taskNotifications = tasks.flatMap<InAppNotification>((task) => {
    const dueAt = asDate(task.dueDate);
    if (!dueAt || task.status === "done") return [];
    if (isBefore(dueAt, now)) {
      return [
        {
          id: `overdue-${task.id}`,
          type: "task_overdue",
          title: `Te laat: ${task.title}`,
          detail: `Verlopen op ${formatDay(dueAt)}`,
          dueAt,
          href: "/tasks",
        },
      ];
    }
    if (isBefore(dueAt, addHours(now, 48))) {
      return [
        {
          id: `soon-${task.id}`,
          type: "task_due_soon",
          title: task.title,
          detail: `Taak vóór ${formatDay(dueAt)}`,
          dueAt,
          href: "/tasks",
        },
      ];
    }
    return [];
  });

  const agendaNotifications = agendaItems.flatMap<InAppNotification>((item) => {
    const startsAt = asDate(item.startDateTime);
    if (!startsAt) return [];
    if (isAfter(startsAt, now) && isBefore(startsAt, addHours(now, 24))) {
      return [
        {
          id: `agenda-${item.id}`,
          type: "agenda_upcoming",
          title: item.title,
          detail: `Agenda: ${formatDay(startsAt)} ${formatTime(startsAt)}`,
          dueAt: startsAt,
          href: "/agenda",
        },
      ];
    }
    return [];
  });

  return [...taskNotifications, ...agendaNotifications].sort(
    (left, right) => left.dueAt.getTime() - right.dueAt.getTime(),
  );
}
