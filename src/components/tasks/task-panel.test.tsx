import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TaskPanel } from "@/components/tasks/task-panel";

describe("TaskPanel", () => {
  it("maakt een nieuwe taak", async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(
      <TaskPanel
        canEdit
        members={[]}
        tasks={[]}
        onCreate={onCreate}
        onDelete={vi.fn()}
        onToggle={vi.fn()}
        onUpdate={vi.fn()}
      />,
    );

    await userEvent.type(screen.getByLabelText("Titel"), "Container buiten");
    await userEvent.click(screen.getByRole("button", { name: /toevoegen/i }));

    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Container buiten",
        category: "huishouden",
        visibleToViewers: true,
      }),
    );
  });

  it("vereist een gekozen dag voor een weekdagherhaling", async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(
      <TaskPanel
        canEdit
        members={[]}
        tasks={[]}
        onCreate={onCreate}
        onDelete={vi.fn()}
        onToggle={vi.fn()}
        onUpdate={vi.fn()}
      />,
    );

    await userEvent.type(screen.getByLabelText("Titel"), "Water geven");
    await userEvent.selectOptions(
      screen.getByLabelText("Herhaling"),
      "weekdays",
    );
    await userEvent.click(screen.getByLabelText("Ma"));
    await userEvent.click(screen.getByRole("button", { name: /toevoegen/i }));

    expect(await screen.findByText("Kies minimaal één weekdag.")).toBeVisible();
    expect(onCreate).not.toHaveBeenCalled();
  });
});
