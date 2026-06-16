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
        onDelete={vi.fn()}
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
        onDelete={vi.fn()}
        onToggle={onToggle}
      />,
    );

    await userEvent.click(screen.getByLabelText("Melk gekocht"));
    expect(onToggle).toHaveBeenCalledWith(item);
    expect(screen.getByText("Melk")).toBeInTheDocument();
  });

  it("voegt een optionele categorie toe en kan een los artikel verwijderen", async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    const onDelete = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <GroceryPanel
        canEdit
        items={[item]}
        onAdd={onAdd}
        onCleanup={vi.fn()}
        onDelete={onDelete}
        onToggle={vi.fn()}
      />,
    );

    await userEvent.type(screen.getByLabelText("Boodschap"), "Yoghurt");
    await userEvent.selectOptions(screen.getByLabelText("Categorie"), "zuivel");
    await userEvent.click(screen.getByLabelText("Toevoegen"));
    await userEvent.click(screen.getByLabelText("Melk verwijderen"));

    expect(onAdd).toHaveBeenCalledWith({ name: "Yoghurt", category: "zuivel" });
    expect(onDelete).toHaveBeenCalledWith("melk");
  });
});
