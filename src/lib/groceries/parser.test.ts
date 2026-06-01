import { describe, expect, it } from "vitest";
import { parseDutchGroceryInput } from "@/lib/groceries/parser";

describe("parseDutchGroceryInput", () => {
  it("haalt aantallen, eenheden en meerdere artikelen uit een zin", () => {
    expect(
      parseDutchGroceryInput(
        "Zet twee pakken melk en bananen op de boodschappenlijst.",
      ),
    ).toEqual([
      {
        name: "Melk",
        quantity: "2",
        unit: "pak",
        confidence: 0.95,
      },
      { name: "Bananen", confidence: 0.87 },
    ]);
  });

  it("herkent een winkel", () => {
    expect(
      parseDutchGroceryInput("Voeg billendoekjes toe voor Kruidvat."),
    ).toEqual([
      {
        name: "Billendoekjes",
        shopLabel: "Kruidvat",
        confidence: 0.95,
      },
    ]);
  });

  it.each([
    [
      "We hebben nog eieren, kaas en yoghurt nodig.",
      ["Eieren", "Kaas", "Yoghurt"],
    ],
    [
      "Zet melk, eieren en luiers op de boodschappenlijst.",
      ["Melk", "Eieren", "Luiers"],
    ],
    ["Voeg twee pakken Griekse yoghurt toe.", ["Griekse yoghurt"]],
  ])("begrijpt casual opdracht: %s", (input, expectedNames) => {
    expect(parseDutchGroceryInput(input).map((item) => item.name)).toEqual(
      expectedNames,
    );
  });
});
