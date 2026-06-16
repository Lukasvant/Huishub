"use client";

import { AgendaPanel } from "@/components/agenda/agenda-panel";
import { DatePollPanel } from "@/components/agenda/date-poll-panel";
import { LoadingScreen, Message, PageHeader } from "@/components/ui";
import { useAuth } from "@/contexts/auth-context";
import { useHousehold } from "@/contexts/household-context";
import { useAgendaItems } from "@/hooks/use-household-data";
import {
  createAgendaItem,
  deleteAgendaItem,
  updateAgendaItem,
} from "@/lib/firebase/data";
import { canEdit } from "@/lib/permissions";

export default function AgendaPage() {
  const { user } = useAuth();
  const { household, member } = useHousehold();
  const { items, loading, error } = useAgendaItems(household?.id, member?.role);
  const editable = canEdit(member?.role);
  const householdId = household?.id ?? "";

  if (loading) return <LoadingScreen text="Agenda laden..." />;

  return (
    <>
      <PageHeader
        title="Agenda"
        description="De papieren agenda blijft leidend; hier maak je hem vindbaar."
      />
      {error && <Message>{error}</Message>}
      <div className="mb-5">
        <DatePollPanel
          agendaItems={items}
          canEdit={editable}
          householdId={householdId}
          user={user}
        />
      </div>
      <AgendaPanel
        canEdit={editable}
        items={items}
        role={member?.role ?? "viewer"}
        onCreate={(input) =>
          createAgendaItem(householdId, user?.uid ?? "", input)
        }
        onUpdate={(itemId, input) =>
          updateAgendaItem(householdId, itemId, input)
        }
        onDelete={(itemId) => deleteAgendaItem(householdId, itemId)}
      />
    </>
  );
}
