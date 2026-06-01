import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { GroceryPanel } from "@/components/groceries/grocery-panel";
import type { GroceryItem } from "@/types/models";

const item = {
  id: "melk",
  householdId: "home",
  name: "Melk",
  status: "needed",
  boughtColorState: "needed",
  addedBy: "user",
  createdAt: new Date(),
  updatedAt: new Date(),
} satisfies GroceryItem;

describe("GroceryPanel", () => {
  it("voegt handmatig snel een artikel toe", async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    render(
      <GroceryPanel
        canEdit
        items={[]}
        onAdd={onAdd}
        onCleanup={vi.fn()}
        onToggle={vi.fn()}
      />,
    );

    await userEvent.type(screen.getByLabelText("Boodschap"), "Appels");
    await userEvent.click(screen.getByLabelText("Toevoegen"));

    expect(onAdd).toHaveBeenCalledWith({ name: "Appels" });
  });

  it("laat een artikel afvinken zonder het te verwijderen", async () => {
    const onToggle = vi.fn().mockResolvedValue(undefined);
    render(
      <GroceryPanel
        canEdit
        items={[item]}
        onAdd={vi.fn()}
        onCleanup={vi.fn()}
        onToggle={onToggle}
      />,
    );

    await userEvent.click(screen.getByLabelText("Melk gekocht"));
    expect(onToggle).toHaveBeenCalledWith(item);
    expect(screen.getByText("Melk")).toBeInTheDocument();
  });
});
