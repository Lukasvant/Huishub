"use client";

import {
  GoogleAIBackend,
  Schema,
  getAI,
  getGenerativeModel,
} from "firebase/ai";
import { firebaseApp } from "@/lib/firebase/client";

export type AgendaPhotoConfidence = "high" | "medium" | "low";

export interface ProposedAgendaItem {
  id: string;
  title: string;
  description?: string;
  startDateTime: string;
  endDateTime?: string;
  allDay: boolean;
  location?: string;
  private: boolean;
  confidence: AgendaPhotoConfidence;
  selected: boolean;
}

export interface AgendaPhotoContext {
  referenceDate: string;
  timeZone: "Europe/Amsterdam";
}

export interface AgendaPhotoExtractor {
  extract(
    file: File,
    context: AgendaPhotoContext,
  ): Promise<ProposedAgendaItem[]>;
}

interface ImagePart {
  inlineData: {
    data: string;
    mimeType: string;
  };
}

const agendaSchema = Schema.array({
  maxItems: 40,
  items: Schema.object({
    properties: {
      title: Schema.string({ description: "Korte Nederlandse titel" }),
      description: Schema.string(),
      startDateTime: Schema.string({
        description: "Lokale datum/tijd als YYYY-MM-DDTHH:mm",
      }),
      endDateTime: Schema.string({
        description: "Lokale einddatum/tijd als YYYY-MM-DDTHH:mm",
      }),
      allDay: Schema.boolean(),
      location: Schema.string(),
      private: Schema.boolean(),
      confidence: Schema.enumString({ enum: ["high", "medium", "low"] }),
    },
    optionalProperties: ["description", "endDateTime", "location"],
  }),
});

function fileAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () =>
      reject(new Error("De foto kon niet worden gelezen."));
    reader.readAsDataURL(file);
  });
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("Dit fotoformaat wordt niet ondersteund."));
    image.src = url;
  });
}

async function prepareImage(file: File): Promise<ImagePart> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Kies een foto van je papieren agenda.");
  }

  const originalUrl = await fileAsDataUrl(file);
  try {
    const image = await loadImage(originalUrl);
    const scale = Math.min(1, 2048 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Foto verkleinen is niet gelukt.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.84);
    return {
      inlineData: {
        data: dataUrl.split(",")[1],
        mimeType: "image/jpeg",
      },
    };
  } catch {
    if (file.size > 15 * 1024 * 1024) {
      throw new Error(
        "De foto is te groot. Maak een kleinere foto en probeer opnieuw.",
      );
    }
    return {
      inlineData: {
        data: originalUrl.split(",")[1],
        mimeType: file.type,
      },
    };
  }
}

function optionalText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function validLocalDateTime(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) &&
    !Number.isNaN(new Date(value).getTime())
  );
}

export function normalizeAgendaPhotoResult(
  input: unknown,
): ProposedAgendaItem[] {
  if (!Array.isArray(input)) return [];

  return input.flatMap((entry, index) => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as Record<string, unknown>;
    const title = optionalText(item.title);
    if (!title || !validLocalDateTime(item.startDateTime)) return [];
    const confidence: AgendaPhotoConfidence =
      item.confidence === "high" ||
      item.confidence === "medium" ||
      item.confidence === "low"
        ? item.confidence
        : "low";

    return [
      {
        id: `voorstel-${index}-${item.startDateTime}`,
        title,
        startDateTime: item.startDateTime,
        allDay: item.allDay === true,
        private: item.private === true,
        confidence,
        selected: true,
        ...(optionalText(item.description)
          ? { description: optionalText(item.description) }
          : {}),
        ...(validLocalDateTime(item.endDateTime)
          ? { endDateTime: item.endDateTime }
          : {}),
        ...(optionalText(item.location)
          ? { location: optionalText(item.location) }
          : {}),
      },
    ];
  });
}

export class GeminiAgendaPhotoExtractor implements AgendaPhotoExtractor {
  async extract(file: File, context: AgendaPhotoContext) {
    if (!firebaseApp) throw new Error("Firebase is nog niet ingesteld.");
    const imagePart = await prepareImage(file);
    const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });
    const model = getGenerativeModel(ai, {
      model: process.env.NEXT_PUBLIC_GEMINI_MODEL ?? "gemini-2.5-flash-lite",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: agendaSchema,
        temperature: 0.1,
        maxOutputTokens: 4096,
      },
      systemInstruction:
        "Je leest een foto van een papieren gezinsagenda. Wees conservatief: verzin nooit afspraken en neem onleesbare regels niet over.",
    });
    const prompt = [
      "Haal alle duidelijk leesbare agenda-afspraken uit deze foto.",
      `Referentiedatum: ${context.referenceDate}. Tijdzone: ${context.timeZone}.`,
      "Gebruik lokale tijden zonder tijdzone in exact formaat YYYY-MM-DDTHH:mm.",
      "Bij een afspraak zonder tijd: zet allDay op true en gebruik 09:00 als starttijd.",
      "Zet private alleen op true als de foto dit expliciet aangeeft; anders false.",
      "Gebruik confidence=low zodra titel, datum of tijd niet volledig zeker is.",
      "Geef alleen de JSON-array volgens het schema terug.",
    ].join("\n");

    try {
      const result = await model.generateContent([prompt, imagePart]);
      const proposals = normalizeAgendaPhotoResult(
        JSON.parse(result.response.text()),
      );
      if (proposals.length === 0) {
        throw new Error(
          "Ik kon geen duidelijke afspraken op deze foto vinden.",
        );
      }
      return proposals;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Ik kon")) {
        throw error;
      }
      throw new Error(
        "De foto kon niet worden geanalyseerd. Controleer Firebase AI Logic en probeer opnieuw.",
      );
    }
  }
}

export const agendaPhotoExtractor: AgendaPhotoExtractor =
  new GeminiAgendaPhotoExtractor();
