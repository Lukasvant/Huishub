import { format } from "date-fns";
import { describe, expect, it } from "vitest";
import { describeRecurrence, nextOccurrence } from "@/lib/tasks/recurrence";

function day(date: Date) {
  return format(date, "yyyy-MM-dd");
}

describe("nextOccurrence", () => {
  it("rekent een interval in dagen, weken en maanden uit", () => {
    const start = new Date("2026-05-27T12:00:00");
    expect(day(nextOccurrence({ type: "daily", interval: 3 }, start))).toBe(
      "2026-05-30",
    );
    expect(day(nextOccurrence({ type: "weekly", interval: 2 }, start))).toBe(
      "2026-06-10",
    );
    expect(day(nextOccurrence({ type: "monthly", interval: 1 }, start))).toBe(
      "2026-06-27",
    );
  });

  it("vindt de eerstvolgende geselecteerde weekdag", () => {
    const monday = new Date("2026-05-25T08:00:00");
    expect(
      day(nextOccurrence({ type: "weekdays", weekdays: [1, 4] }, monday)),
    ).toBe("2026-05-28");
  });

  it("ondersteunt de laatste vrijdag van een maand", () => {
    expect(
      day(
        nextOccurrence({ type: "last_friday_month" }, new Date("2026-05-05")),
      ),
    ).toBe("2026-05-29");
    expect(
      day(
        nextOccurrence({ type: "last_friday_month" }, new Date("2026-05-30")),
      ),
    ).toBe("2026-06-26");
  });

  it("beschrijft aangepaste intervallen helder", () => {
    expect(describeRecurrence({ type: "monthly", interval: 2 })).toBe(
      "Elke 2 maanden",
    );
  });
});
