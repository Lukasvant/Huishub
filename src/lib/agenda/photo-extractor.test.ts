import { describe, expect, it } from "vitest";
import { normalizeAgendaPhotoResult } from "@/lib/agenda/photo-extractor";

describe("normalizeAgendaPhotoResult", () => {
  it("houdt geldige voorstellen over en vult veilige defaults in", () => {
    expect(
      normalizeAgendaPhotoResult([
        {
          title: "Tandarts",
          startDateTime: "2026-06-22T10:30",
          allDay: false,
          private: true,
          confidence: "high",
          location: "Utrecht",
        },
      ]),
    ).toMatchObject([
      {
        title: "Tandarts",
        startDateTime: "2026-06-22T10:30",
        allDay: false,
        private: true,
        confidence: "high",
        selected: true,
        location: "Utrecht",
      },
    ]);
  });

  it("weigert regels zonder geldige titel of lokale datum", () => {
    expect(
      normalizeAgendaPhotoResult([
        { title: "", startDateTime: "2026-06-22T10:30" },
        { title: "Sport", startDateTime: "maandag" },
      ]),
    ).toEqual([]);
  });
});
