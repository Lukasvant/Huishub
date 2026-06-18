"use client";

import Image from "next/image";
import Link from "next/link";
import { Camera, Check, ChevronLeft, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button, Card, Message, PageHeader } from "@/components/ui";
import { useAuth } from "@/contexts/auth-context";
import { useHousehold } from "@/contexts/household-context";
import {
  agendaPhotoExtractor,
  type ProposedAgendaItem,
} from "@/lib/agenda/photo-extractor";
import { createAgendaItems } from "@/lib/firebase/data";
import { canEdit } from "@/lib/permissions";

function localDateValue() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

function confidenceLabel(confidence: ProposedAgendaItem["confidence"]) {
  if (confidence === "high") return "Duidelijk gelezen";
  if (confidence === "medium") return "Even controleren";
  return "Onzeker, goed nakijken";
}

export default function AgendaPhotoUploadPage() {
  const { user } = useAuth();
  const { household, member } = useHousehold();
  const [file, setFile] = useState<File>();
  const [referenceDate, setReferenceDate] = useState(localDateValue);
  const [proposals, setProposals] = useState<ProposedAgendaItem[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>();
  const [saved, setSaved] = useState(false);
  const previewUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : ""),
    [file],
  );
  const editable = canEdit(member?.role);

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  function update(id: string, changes: Partial<ProposedAgendaItem>) {
    setProposals((current) =>
      current.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    );
  }

  async function analyze() {
    if (!file) {
      setMessage("Maak of kies eerst een foto.");
      return;
    }
    setAnalyzing(true);
    setMessage(undefined);
    setSaved(false);
    try {
      const result = await agendaPhotoExtractor.extract(file, {
        referenceDate,
        timeZone: "Europe/Amsterdam",
      });
      setProposals(result);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "De foto kon niet worden geanalyseerd.",
      );
    } finally {
      setAnalyzing(false);
    }
  }

  async function save() {
    if (!household?.id || !user?.uid) return;
    const selected = proposals.filter((item) => item.selected);
    if (selected.length === 0) {
      setMessage("Selecteer ten minste één afspraak.");
      return;
    }
    if (
      selected.some(
        (item) =>
          !item.title.trim() ||
          !item.startDateTime ||
          Number.isNaN(new Date(item.startDateTime).getTime()) ||
          (item.endDateTime &&
            Number.isNaN(new Date(item.endDateTime).getTime())),
      )
    ) {
      setMessage(
        "Controleer de titel en datum van alle geselecteerde afspraken.",
      );
      return;
    }
    setSaving(true);
    setMessage(undefined);
    try {
      await createAgendaItems(
        household.id,
        user.uid,
        selected.map((item) => ({
          title: item.title,
          description: item.description,
          startDateTime: new Date(item.startDateTime),
          endDateTime: item.endDateTime
            ? new Date(item.endDateTime)
            : undefined,
          allDay: item.allDay,
          location: item.location,
          private: item.private,
          source: "photo_ocr",
        })),
      );
      setSaved(true);
      setMessage(
        `${selected.length} afspraak${selected.length === 1 ? "" : "en"} toegevoegd.`,
      );
      setProposals([]);
      setFile(undefined);
    } catch {
      setMessage(
        "Opslaan is niet gelukt. Er is niets gedeeltelijk toegevoegd.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!editable) {
    return (
      <Message tone="info">
        Je hebt alleen-lezen toegang en kunt geen agendafoto verwerken.
      </Message>
    );
  }

  return (
    <>
      <PageHeader
        title="Agenda scannen"
        description="Gemini maakt voorstellen. Jij controleert alles voor het wordt opgeslagen."
        action={
          <Link href="/agenda">
            <Button variant="secondary">
              <ChevronLeft className="h-4 w-4" /> Agenda
            </Button>
          </Link>
        }
      />
      <div className="mx-auto max-w-3xl space-y-4">
        <Card>
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sage-50 text-sage-600">
              <Camera className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-semibold">1. Maak een scherpe foto</h2>
              <p className="mt-1 text-sm text-muted">
                Zorg dat datums, tijden en handschrift recht en goed belicht
                zijn. De foto wordt niet in TaskHive bewaard.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_12rem]">
            <label>
              <span className="label">Foto</span>
              <input
                accept="image/*"
                capture="environment"
                className="field file:mr-3 file:rounded-full file:border-0 file:bg-sage-50 file:px-3 file:py-2 file:text-xs file:font-semibold"
                type="file"
                onChange={(event) => {
                  setFile(event.target.files?.[0]);
                  setProposals([]);
                  setMessage(undefined);
                  setSaved(false);
                }}
              />
            </label>
            <label>
              <span className="label">Datum op of rond de pagina</span>
              <input
                className="field"
                type="date"
                value={referenceDate}
                onChange={(event) => setReferenceDate(event.target.value)}
              />
            </label>
          </div>
          {previewUrl && (
            <div className="relative mt-4 aspect-[4/3] overflow-hidden rounded-2xl border border-line bg-canvas">
              <Image
                alt="Voorbeeld van de agendafoto"
                className="object-contain"
                fill
                sizes="(max-width: 768px) 100vw, 768px"
                src={previewUrl}
                unoptimized
              />
            </div>
          )}
          <Button
            className="mt-4 w-full"
            disabled={!file || analyzing}
            onClick={() => void analyze()}
          >
            <Sparkles className="h-4 w-4" />
            {analyzing ? "Gemini leest de agenda..." : "Foto analyseren"}
          </Button>
        </Card>

        {message && (
          <Message tone={saved ? "success" : "error"}>{message}</Message>
        )}

        {proposals.length > 0 && (
          <section className="space-y-3">
            <div>
              <h2 className="font-serif text-3xl">
                2. Controleer de voorstellen
              </h2>
              <p className="text-sm text-muted">
                Pas fouten aan en vink twijfelachtige afspraken uit.
              </p>
            </div>
            {proposals.map((item) => (
              <Card
                className={!item.selected ? "opacity-60" : undefined}
                key={item.id}
              >
                <div className="flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <input
                      checked={item.selected}
                      className="h-5 w-5 accent-cyan-600"
                      type="checkbox"
                      onChange={(event) =>
                        update(item.id, { selected: event.target.checked })
                      }
                    />
                    Toevoegen
                  </label>
                  <span className="text-xs text-muted">
                    {confidenceLabel(item.confidence)}
                  </span>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="sm:col-span-2">
                    <span className="label">Titel</span>
                    <input
                      className="field"
                      value={item.title}
                      onChange={(event) =>
                        update(item.id, { title: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    <span className="label">Begint</span>
                    <input
                      className="field"
                      type="datetime-local"
                      value={item.startDateTime}
                      onChange={(event) =>
                        update(item.id, { startDateTime: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    <span className="label">Eindigt, optioneel</span>
                    <input
                      className="field"
                      type="datetime-local"
                      value={item.endDateTime ?? ""}
                      onChange={(event) =>
                        update(item.id, {
                          endDateTime: event.target.value || undefined,
                        })
                      }
                    />
                  </label>
                  <label>
                    <span className="label">Locatie, optioneel</span>
                    <input
                      className="field"
                      value={item.location ?? ""}
                      onChange={(event) =>
                        update(item.id, {
                          location: event.target.value || undefined,
                        })
                      }
                    />
                  </label>
                  <label>
                    <span className="label">Notitie, optioneel</span>
                    <input
                      className="field"
                      value={item.description ?? ""}
                      onChange={(event) =>
                        update(item.id, {
                          description: event.target.value || undefined,
                        })
                      }
                    />
                  </label>
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      checked={item.allDay}
                      type="checkbox"
                      onChange={(event) =>
                        update(item.id, { allDay: event.target.checked })
                      }
                    />
                    Hele dag
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      checked={item.private}
                      type="checkbox"
                      onChange={(event) =>
                        update(item.id, { private: event.target.checked })
                      }
                    />
                    Privé
                  </label>
                  <button
                    className="ml-auto inline-flex items-center gap-1 text-red-700"
                    type="button"
                    onClick={() =>
                      setProposals((current) =>
                        current.filter((entry) => entry.id !== item.id),
                      )
                    }
                  >
                    <Trash2 className="h-4 w-4" /> Verwijder voorstel
                  </button>
                </div>
              </Card>
            ))}
            <Button
              className="w-full"
              disabled={saving}
              onClick={() => void save()}
            >
              <Check className="h-4 w-4" />
              {saving ? "Opslaan..." : "Geselecteerde afspraken bevestigen"}
            </Button>
          </section>
        )}
      </div>
    </>
  );
}
