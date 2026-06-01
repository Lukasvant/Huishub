"use client";

import { Mic, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button, Card, Message } from "@/components/ui";
import { parseDutchGroceryInput } from "@/lib/groceries/parser";
import type { ParsedGroceryItem } from "@/types/models";

interface SpeechRecognitionResultEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

interface Recognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
}

type RecognitionConstructor = new () => Recognition;

export function VoiceGroceryInput({
  onConfirm,
}: {
  onConfirm: (items: ParsedGroceryItem[]) => Promise<void>;
}) {
  const [transcript, setTranscript] = useState("");
  const [items, setItems] = useState<ParsedGroceryItem[]>([]);
  const [listening, setListening] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();

  function parse(text: string) {
    const parsed = parseDutchGroceryInput(text);
    setItems(parsed);
    setReviewing(true);
    if (parsed.length === 0) {
      setMessage(
        "Ik kon geen artikelen herkennen. Voeg hieronder handmatig regels toe.",
      );
    } else {
      setMessage(undefined);
    }
  }

  function listen() {
    const browserWindow = window as typeof window & {
      SpeechRecognition?: RecognitionConstructor;
      webkitSpeechRecognition?: RecognitionConstructor;
    };
    const SpeechRecognition =
      browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMessage(
        "Spraakherkenning werkt niet in deze browser. Typ de zin hieronder.",
      );
      setReviewing(true);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "nl-NL";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      parse(text);
    };
    recognition.onerror = () => {
      setMessage("Luisteren ging niet goed. Probeer opnieuw of typ je lijst.");
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    setListening(true);
    recognition.start();
  }

  function update(index: number, updates: Partial<ParsedGroceryItem>) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...updates } : item,
      ),
    );
  }

  async function confirm() {
    const usable = items.filter((item) => item.name.trim());
    if (usable.length === 0) {
      setMessage("Voeg ten minste één artikel toe.");
      return;
    }
    setBusy(true);
    try {
      await onConfirm(usable);
      setMessage("Toegevoegd aan de boodschappenlijst.");
      setTranscript("");
      setItems([]);
      setReviewing(false);
    } catch {
      setMessage("Toevoegen is niet gelukt. Probeer het nog eens.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card id="spraak">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Inspreken</h2>
          <p className="text-sm text-muted">
            Nederlands, altijd eerst nakijken.
          </p>
        </div>
        <Button onClick={listen} disabled={listening || busy}>
          <Mic className="h-4 w-4" />
          {listening ? "Luisteren..." : "Spreek in"}
        </Button>
      </div>
      {(reviewing || transcript) && (
        <div className="mt-4 space-y-3">
          <label>
            <span className="label">Gesproken tekst</span>
            <textarea
              className="field min-h-20 resize-none"
              placeholder="Bijv. Zet twee pakken melk en bananen op de boodschappenlijst."
              value={transcript}
              onChange={(event) => setTranscript(event.target.value)}
            />
          </label>
          <Button variant="secondary" onClick={() => parse(transcript)}>
            Tekst verwerken
          </Button>
          {message && (
            <Message
              tone={message.startsWith("Toegevoegd") ? "success" : "info"}
            >
              {message}
            </Message>
          )}
          {items.map((item, index) => (
            <div
              className="grid grid-cols-[1fr_4.5rem_5.5rem_2.5rem] gap-2"
              key={index}
            >
              <input
                aria-label={`Artikel ${index + 1}`}
                className="field"
                value={item.name}
                onChange={(event) =>
                  update(index, { name: event.target.value })
                }
              />
              <input
                aria-label={`Aantal ${index + 1}`}
                className="field"
                placeholder="Aantal"
                value={item.quantity ?? ""}
                onChange={(event) =>
                  update(index, { quantity: event.target.value || undefined })
                }
              />
              <input
                aria-label={`Winkel ${index + 1}`}
                className="field"
                placeholder="Winkel"
                value={item.shopLabel ?? ""}
                onChange={(event) =>
                  update(index, { shopLabel: event.target.value || undefined })
                }
              />
              <Button
                aria-label="Verwijder regel"
                className="px-2"
                variant="ghost"
                onClick={() =>
                  setItems((current) =>
                    current.filter((_, itemIndex) => index !== itemIndex),
                  )
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="secondary"
            onClick={() =>
              setItems((current) => [...current, { name: "", confidence: 1 }])
            }
          >
            <Plus className="h-4 w-4" />
            Regel toevoegen
          </Button>
          {items.length > 0 && (
            <Button className="w-full" onClick={confirm} disabled={busy}>
              {busy ? "Toevoegen..." : "Bevestig en voeg toe"}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
