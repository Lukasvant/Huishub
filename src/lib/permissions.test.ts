import { describe, expect, it } from "vitest";
import {
  canEdit,
  canManageMembers,
  canViewAgendaItem,
  canViewTask,
} from "@/lib/permissions";
import type { AgendaItem, Task } from "@/types/models";

const task = {
  id: "task",
  householdId: "home",
  title: "Stofzuigen",
  category: "huishouden",
  status: "open",
  visibleToViewers: false,
  createdBy: "admin",
  createdAt: new Date(),
  updatedAt: new Date(),
} satisfies Task;

const privateAgenda = {
  id: "private",
  householdId: "home",
  title: "Afspraak",
  startDateTime: new Date(),
  allDay: false,
  private: true,
  visibleToViewers: false,
  source: "manual",
  createdBy: "admin",
  createdAt: new Date(),
  updatedAt: new Date(),
} satisfies AgendaItem;

describe("rolrechten", () => {
  it("geeft alleen admin en partner schrijfrechten", () => {
    expect(canEdit("admin")).toBe(true);
    expect(canEdit("partner")).toBe(true);
    expect(canEdit("viewer")).toBe(false);
    expect(canManageMembers("partner")).toBe(false);
    expect(canManageMembers("admin")).toBe(true);
  });

  it("schermt verborgen taken en privé-afspraken af voor viewers", () => {
    expect(canViewTask("viewer", task)).toBe(false);
    expect(canViewTask("partner", task)).toBe(true);
    expect(canViewAgendaItem("viewer", privateAgenda)).toBe(false);
    expect(canViewAgendaItem("admin", privateAgenda)).toBe(true);
  });
});
