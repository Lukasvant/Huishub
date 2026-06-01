import type { ParsedGroceryItem } from "@/types/models";

const numberWords: Record<string, string> = {
  een: "1",
  één: "1",
  twee: "2",
  drie: "3",
  vier: "4",
  vijf: "5",
  zes: "6",
  zeven: "7",
  acht: "8",
  negen: "9",
  tien: "10",
};

const units: Record<string, string> = {
  pak: "pak",
  pakken: "pak",
  fles: "fles",
  flessen: "fles",
  doos: "doos",
  dozen: "doos",
  zak: "zak",
  zakken: "zak",
  kilo: "kg",
  kg: "kg",
  liter: "liter",
  stuks: "stuks",
  stuk: "stuks",
};

const shops: Array<[RegExp, string]> = [
  [/\balbert\s*heijn\b/i, "AH"],
  [/\bah\b/i, "AH"],
  [/\bkruidvat\b/i, "Kruidvat"],
  [/\bdirk\b/i, "Dirk"],
  [/\bjumbo\b/i, "Jumbo"],
  [/\blidl\b/i, "Lidl"],
];

function extractShopLabel(transcript: string): {
  text: string;
  shopLabel?: string;
} {
  for (const [pattern, label] of shops) {
    if (pattern.test(transcript)) {
      return {
        text: transcript.replace(
          new RegExp(`\\s+(?:voor|bij|van)\\s+${pattern.source}`, "i"),
          "",
        ),
        shopLabel: label,
      };
    }
  }
  return { text: transcript };
}

function cleanCommand(text: string): string {
  return text
    .replace(/[.!?]/g, "")
    .replace(/\b(?:zet|voeg)\b/gi, "")
    .replace(/\btoe\b/gi, "")
    .replace(/\bop\s+de\s+boodschappenlijst\b/gi, "")
    .replace(/\bwe\s+hebben\s+nog\b/gi, "")
    .replace(/\bnodig\b/gi, "")
    .replace(/\bgraag\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parsePart(
  raw: string,
  shopLabel?: string,
): ParsedGroceryItem | undefined {
  const part = raw.trim();
  if (!part) return undefined;

  const tokens = part.split(/\s+/);
  let quantity: string | undefined;
  let unit: string | undefined;
  let index = 0;

  if (/^\d+(?:[,.]\d+)?$/.test(tokens[0])) {
    quantity = tokens[0].replace(",", ".");
    index += 1;
  } else if (numberWords[tokens[0]?.toLowerCase()]) {
    quantity = numberWords[tokens[0].toLowerCase()];
    index += 1;
  }

  const possibleUnit = tokens[index]?.toLowerCase();
  if (possibleUnit && units[possibleUnit]) {
    unit = units[possibleUnit];
    index += 1;
  }

  const name = tokens.slice(index).join(" ").trim();
  if (!name) return undefined;

  return {
    name: name.charAt(0).toUpperCase() + name.slice(1),
    ...(quantity ? { quantity } : {}),
    ...(unit ? { unit } : {}),
    ...(shopLabel ? { shopLabel } : {}),
    confidence: quantity || shopLabel ? 0.95 : 0.87,
  };
}

export function parseDutchGroceryInput(
  transcript: string,
): ParsedGroceryItem[] {
  const { text, shopLabel } = extractShopLabel(transcript.trim());
  const cleaned = cleanCommand(text);
  if (!cleaned) return [];

  return cleaned
    .replace(/\s+en\s+/gi, ",")
    .split(",")
    .map((part) => parsePart(part, shopLabel))
    .filter((item): item is ParsedGroceryItem => Boolean(item));
}
