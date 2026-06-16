import type {
  AgendaItem,
  Household,
  HouseholdMember,
  HouseholdRole,
  Task,
} from "@/types/models";

export function canEdit(role?: HouseholdRole): boolean {
  return role === "admin" || role === "partner";
}

export function canManageMembers(
  role?: HouseholdRole,
  household?: Pick<Household, "createdBy">,
  userId?: string,
): boolean {
  return role === "admin" || Boolean(userId && household?.createdBy === userId);
}

export function canViewTask(role: HouseholdRole, task: Task): boolean {
  return role !== "viewer" || task.visibleToViewers;
}

export function canViewAgendaItem(
  role: HouseholdRole,
  agendaItem: AgendaItem,
): boolean {
  return (
    role !== "viewer" || (!agendaItem.private && agendaItem.visibleToViewers)
  );
}

export function visibleTasks(
  member: Pick<HouseholdMember, "role">,
  tasks: Task[],
): Task[] {
  return tasks.filter((task) => canViewTask(member.role, task));
}

export function visibleAgendaItems(
  member: Pick<HouseholdMember, "role">,
  items: AgendaItem[],
): AgendaItem[] {
  return items.filter((item) => canViewAgendaItem(member.role, item));
}
