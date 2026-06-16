"use client";

import { LoadingScreen, PageHeader, Message } from "@/components/ui";
import { GroceryPanel } from "@/components/groceries/grocery-panel";
import { VoiceGroceryInput } from "@/components/groceries/voice-grocery-input";
import { useAuth } from "@/contexts/auth-context";
import { useHousehold } from "@/contexts/household-context";
import { useGroceries } from "@/hooks/use-household-data";
import {
  cleanBoughtGroceries,
  createGroceryItem,
  deleteGroceryItem,
  toggleGroceryBought,
} from "@/lib/firebase/data";
import { canEdit } from "@/lib/permissions";
import type { ParsedGroceryItem } from "@/types/models";

export default function GroceriesPage() {
  const { user } = useAuth();
  const { household, member } = useHousehold();
  const { items, loading, error } = useGroceries(household?.id);
  const editable = canEdit(member?.role);
  const householdId = household?.id ?? "";
  const userId = user?.uid ?? "";

  async function addParsedItems(parsedItems: ParsedGroceryItem[]) {
    await Promise.all(
      parsedItems.map((item) => createGroceryItem(householdId, userId, item)),
    );
  }

  if (loading) return <LoadingScreen text="Boodschappen laden..." />;

  return (
    <>
      <PageHeader
        title="Boodschappen"
        description="Eén gedeelde lijst. Gekocht blijft zichtbaar tot je opruimt."
      />
      <div className="grid items-start gap-5 lg:grid-cols-[1fr_22rem]">
        <GroceryPanel
          canEdit={editable}
          items={items}
          onAdd={(input) => createGroceryItem(householdId, userId, input)}
          onToggle={(item) =>
            toggleGroceryBought(householdId, item.id, item.status !== "bought")
          }
          onDelete={(itemId) => deleteGroceryItem(householdId, itemId)}
          onCleanup={() => cleanBoughtGroceries(householdId)}
        />
        <div className="space-y-3">
          {editable && <VoiceGroceryInput onConfirm={addParsedItems} />}
          {!editable && (
            <Message tone="info">Je kunt deze lijst alleen bekijken.</Message>
          )}
          {error && <Message>{error}</Message>}
        </div>
      </div>
    </>
  );
}
