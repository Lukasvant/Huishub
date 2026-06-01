"use client";

import {
  CalendarPlus,
  CheckSquare,
  Mic,
  Plus,
  ShoppingBasket,
} from "lucide-react";
import { isAfter, isSameDay, startOfDay } from "date-fns";
import Link from "next/link";
import {
  Button,
  Card,
  EmptyState,
  LoadingScreen,
  Message,
  PageHeader,
} from "@/components/ui";
import { useHousehold } from "@/contexts/household-context";
import {
  useAgendaItems,
  useGroceries,
  useTasks,
} from "@/hooks/use-household-data";
import { asDate, formatDay, formatTime } from "@/lib/date";
import { buildInAppNotifications } from "@/lib/notifications";
import { canEdit } from "@/lib/permissions";
import { isTaskDueSoon } from "@/lib/tasks/recurrence";

export default function DashboardPage() {
  const { household, member } = useHousehold();
  const {
    items: tasks,
    loading: tasksLoading,
    error: taskError,
  } = useTasks(household?.id, member?.role);
  const {
    items: groceries,
    loading: groceriesLoading,
    error: groceryError,
  } = useGroceries(household?.id);
  const {
    items: agenda,
    loading: agendaLoading,
    error: agendaError,
  } = useAgendaItems(household?.id, member?.role);
  const now = new Date();
  const editable = canEdit(member?.role);
  const today = agenda
    .filter((item) => isSameDay(asDate(item.startDateTime)!, now))
    .sort(
      (left, right) =>
        asDate(left.startDateTime)!.getTime() -
        asDate(right.startDateTime)!.getTime(),
    );
  const upcoming = agenda
    .filter((item) => isAfter(asDate(item.startDateTime)!, now))
    .sort(
      (left, right) =>
        asDate(left.startDateTime)!.getTime() -
        asDate(right.startDateTime)!.getTime(),
    )
    .slice(0, 4);
  const openTasks = tasks.filter((task) => task.status === "open").slice(0, 5);
  const recurringDueSoon = tasks.filter(
    (task) => task.recurrence && isTaskDueSoon(task, startOfDay(now)),
  );
  const needed = groceries.filter((item) => item.status === "needed");
  const notifications = buildInAppNotifications(tasks, agenda, now).slice(0, 4);
  const error = taskError ?? groceryError ?? agendaError;

  if (tasksLoading || groceriesLoading || agendaLoading) {
    return <LoadingScreen text="Overzicht laden..." />;
  }

  return (
    <>
      <PageHeader
        title={household?.name ?? "Dashboard"}
        description="Vandaag in één rustig overzicht."
      />
      {error && <Message>{error}</Message>}
      {editable && (
        <section className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { href: "/tasks#nieuw", label: "Taak", icon: CheckSquare },
            {
              href: "/groceries",
              label: "Boodschap",
              icon: ShoppingBasket,
            },
            { href: "/groceries#spraak", label: "Inspreken", icon: Mic },
            { href: "/agenda#nieuw", label: "Afspraak", icon: CalendarPlus },
          ].map(({ href, label, icon: Icon }) => (
            <Link href={href} key={label}>
              <Button className="w-full flex-col py-3" variant="secondary">
                <Icon className="h-5 w-5 text-sage-600" />
                {label}
              </Button>
            </Link>
          ))}
        </section>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-3 font-semibold">Vandaag</h2>
          {today.length === 0 ? (
            <p className="text-sm text-muted">Geen afspraken voor vandaag.</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {today.map((item) => (
                <li className="flex gap-3 py-2.5" key={item.id}>
                  <span className="w-14 text-sm text-muted">
                    {item.allDay
                      ? "Hele dag"
                      : formatTime(asDate(item.startDateTime)!)}
                  </span>
                  <span className="font-medium">{item.title}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">Boodschappen</h2>
          <p className="text-3xl font-semibold">{needed.length}</p>
          <p className="text-sm text-muted">nog nodig</p>
          {editable && (
            <Link
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-sage-600"
              href="/groceries"
            >
              <Plus className="h-4 w-4" /> Snel toevoegen
            </Link>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">Open taken</h2>
          {openTasks.length === 0 ? (
            <p className="text-sm text-muted">Alles is klaar.</p>
          ) : (
            <ul className="space-y-2">
              {openTasks.map((task) => (
                <li className="text-sm" key={task.id}>
                  <p className="font-medium">{task.title}</p>
                  {asDate(task.dueDate) && (
                    <p className="text-muted">
                      {formatDay(asDate(task.dueDate)!)}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
          {recurringDueSoon.length > 0 && (
            <p className="mt-3 rounded-lg bg-sage-50 p-2 text-xs text-sage-600">
              {recurringDueSoon.length} terugkerende taak
              {recurringDueSoon.length === 1 ? "" : "en"} binnenkort verwacht.
            </p>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">Straks</h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted">Geen komende afspraken.</p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((item) => (
                <li className="text-sm" key={item.id}>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-muted">
                    {formatDay(asDate(item.startDateTime)!)} ·{" "}
                    {formatTime(asDate(item.startDateTime)!)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">Meldingen</h2>
          {notifications.length === 0 ? (
            <EmptyState title="Rustig" text="Er zijn geen urgente meldingen." />
          ) : (
            <ul className="space-y-2">
              {notifications.map((notification) => (
                <li
                  className="rounded-xl bg-warm p-2.5 text-sm"
                  key={notification.id}
                >
                  <Link href={notification.href}>
                    <p className="font-medium">{notification.title}</p>
                    <p className="text-muted">{notification.detail}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
