import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { addDays } from "date-fns";
import { describe, expect, it, vi } from "vitest";
import { AgendaPanel } from "@/components/agenda/agenda-panel";
import type { AgendaItem } from "@/types/models";

const privateItem = {
  id: "private",
  householdId: "home",
  title: "Privé tandarts",
  startDateTime: addDays(new Date(), 1),
  allDay: false,
  private: true,
  visibleToViewers: false,
  createdBy: "admin",
  source: "manual",
  createdAt: new Date(),
  updatedAt: new Date(),
} satisfies AgendaItem;

const sharedItem = {
  ...privateItem,
  id: "shared",
  title: "School ophalen",
  private: false,
  visibleToViewers: true,
} satisfies AgendaItem;

describe("AgendaPanel", () => {
  it("maakt een privé-afspraak met expliciete privacykeuze", async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(
      <AgendaPanel
        canEdit
        items={[]}
        role="partner"
        onCreate={onCreate}
        onDelete={vi.fn()}
        onUpdate={vi.fn()}
      />,
    );
    await userEvent.type(screen.getByLabelText("Titel"), "Consult");
    await userEvent.type(screen.getByLabelText("Start"), "2026-06-03T09:00");
    await userEvent.click(
      screen.getByLabelText("Privé (volledig verborgen voor meekijkers)"),
    );
    await userEvent.click(screen.getByRole("button", { name: /toevoegen/i }));

    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Consult", private: true }),
    );
  });

  it("toont geen privé-agenda-informatie aan een viewer", () => {
    render(
      <AgendaPanel
        canEdit={false}
        items={[privateItem, sharedItem]}
        role="viewer"
        onCreate={vi.fn()}
        onDelete={vi.fn()}
        onUpdate={vi.fn()}
      />,
    );

    expect(screen.queryByText("Privé tandarts")).not.toBeInTheDocument();
    expect(screen.getByText("School ophalen")).toBeInTheDocument();
  });
});
