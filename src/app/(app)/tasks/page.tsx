"use client";

import { LoadingScreen, Message, PageHeader } from "@/components/ui";
import { TaskPanel } from "@/components/tasks/task-panel";
import { useAuth } from "@/contexts/auth-context";
import { useHousehold } from "@/contexts/household-context";
import { useMembers, useTasks } from "@/hooks/use-household-data";
import {
  createTask,
  deleteTask,
  toggleTaskDone,
  updateTask,
} from "@/lib/firebase/data";
import { canEdit } from "@/lib/permissions";

export default function TasksPage() {
  const { user } = useAuth();
  const { household, member } = useHousehold();
  const { items, loading, error } = useTasks(household?.id, member?.role);
  const { items: members, loading: membersLoading } = useMembers(household?.id);
  const editable = canEdit(member?.role);
  const householdId = household?.id ?? "";

  if (loading || membersLoading) return <LoadingScreen text="Taken laden..." />;

  return (
    <>
      <PageHeader
        title="Taken"
        description="Een rustige lijst met een duidelijke volgende stap."
      />
      {error && <Message>{error}</Message>}
      <TaskPanel
        canEdit={editable}
        members={members}
        tasks={items}
        onCreate={(input) => createTask(householdId, user?.uid ?? "", input)}
        onUpdate={(taskId, input) => updateTask(householdId, taskId, input)}
        onToggle={(task) => toggleTaskDone(householdId, task)}
        onDelete={(taskId) => deleteTask(householdId, taskId)}
      />
    </>
  );
}
