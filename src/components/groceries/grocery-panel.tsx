"use client";

import { Check, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import clsx from "clsx";
import { Button, EmptyState, Message } from "@/components/ui";
import type { NewGroceryInput } from "@/lib/firebase/data";
import type { GroceryCategory, GroceryItem } from "@/types/models";

interface GroceryPanelProps {
  items: GroceryItem[];
  canEdit: boolean;
  onAdd: (item: NewGroceryInput) => Promise<void>;
  onToggle: (item: GroceryItem) => Promise<void>;
  onDelete: (itemId: string) => Promise<void>;
  onCleanup: () => Promise<void>;
}

const quickItems = ["Melk", "Brood", "Eieren", "Bananen", "Luiers"];
const categories: Array<{ value: GroceryCategory; label: string }> = [
  { value: "groente", label: "Groente" },
  { value: "zuivel", label: "Zuivel" },
  { value: "baby", label: "Baby" },
  { value: "drogist", label: "Drogist" },
  { value: "brood", label: "Brood" },
  { value: "vlees", label: "Vlees" },
  { value: "overig", label: "Overig" },
];

export function GroceryPanel({
  items,
  canEdit,
  onAdd,
  onToggle,
  onDelete,
  onCleanup,
}: GroceryPanelProps) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [shopLabel, setShopLabel] = useState("");
  const [category, setCategory] = useState<GroceryCategory | "">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const boughtCount = items.filter((item) => item.status === "bought").length;
  const ordered = [...items].sort((left, right) =>
    left.status === right.status ? 0 : left.status === "needed" ? -1 : 1,
  );

  async function add(item: NewGroceryInput): Promise<boolean> {
    setBusy(true);
    setError(undefined);
    try {
      await onAdd(item);
      return true;
    } catch {
      setError("Dit artikel kon niet worden toegevoegd.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    const added = await add({
      name,
      ...(quantity.trim() ? { quantity: quantity.trim() } : {}),
      ...(shopLabel.trim() ? { shopLabel: shopLabel.trim() } : {}),
      ...(category ? { category } : {}),
    });
    if (added) {
      setName("");
      setQuantity("");
      setShopLabel("");
      setCategory("");
    }
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="rounded-2xl bg-white p-4 shadow-calm">
          <form className="flex gap-2" onSubmit={submit}>
            <input
              aria-label="Boodschap"
              className="field min-w-0 flex-1"
              placeholder="Wat hebben jullie nodig?"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <Button aria-label="Toevoegen" disabled={busy} type="submit">
              <Plus className="h-5 w-5" />
            </Button>
          </form>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input
              aria-label="Aantal"
              className="field"
              placeholder="Aantal"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
            <input
              aria-label="Winkel"
              className="field"
              placeholder="Winkel, bijv. AH"
              value={shopLabel}
              onChange={(event) => setShopLabel(event.target.value)}
            />
          </div>
          <label className="mt-2 block">
            <span className="sr-only">Categorie</span>
            <select
              aria-label="Categorie"
              className="field"
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as GroceryCategory | "")
              }
            >
              <option value="">Geen categorie</option>
              {categories.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>
          <div
            className="mt-3 flex flex-wrap gap-2"
            aria-label="Snel toevoegen"
          >
            {quickItems.map((item) => (
              <button
                className="rounded-full bg-warm px-3 py-2 text-sm text-ink"
                disabled={busy}
                key={item}
                onClick={() => add({ name: item })}
                type="button"
              >
                + {item}
              </button>
            ))}
          </div>
        </div>
      )}
      {error && <Message>{error}</Message>}
      {items.length === 0 ? (
        <EmptyState
          title="De lijst is leeg"
          text={
            canEdit
              ? "Voeg snel iets toe voor de volgende boodschap."
              : "Er staan nu geen boodschappen op de lijst."
          }
        />
      ) : (
        <ul className="space-y-2">
          {ordered.map((item) => (
            <li
              className={clsx(
                "flex min-h-14 items-center gap-3 rounded-2xl border px-4 py-3 transition",
                item.status === "bought"
                  ? "border-sage-100 bg-sage-50 text-muted"
                  : "border-stone-100 bg-white",
              )}
              key={item.id}
            >
              {canEdit ? (
                <button
                  aria-label={
                    item.status === "bought"
                      ? `${item.name} terugzetten`
                      : `${item.name} gekocht`
                  }
                  className={clsx(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
                    item.status === "bought"
                      ? "border-sage-500 bg-sage-500 text-white"
                      : "border-stone-300 bg-white",
                  )}
                  onClick={async () => {
                    try {
                      await onToggle(item);
                    } catch {
                      setError("De gekocht-status kon niet worden bijgewerkt.");
                    }
                  }}
                >
                  {item.status === "bought" && <Check className="h-4 w-4" />}
                </button>
              ) : (
                <span
                  className={clsx(
                    "h-3 w-3 rounded-full",
                    item.status === "bought" ? "bg-sage-500" : "bg-stone-300",
                  )}
                />
              )}
              <div className="min-w-0 flex-1">
                <p
                  className={clsx(
                    "font-medium",
                    item.status === "bought" && "line-through",
                  )}
                >
                  {item.name}
                </p>
                {(item.quantity ||
                  item.unit ||
                  item.shopLabel ||
                  item.category) && (
                  <p className="text-sm text-muted">
                    {[item.quantity, item.unit, item.shopLabel, item.category]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>
              {canEdit && (
                <Button
                  aria-label={`${item.name} verwijderen`}
                  className="px-2"
                  variant="ghost"
                  onClick={() => {
                    if (window.confirm(`${item.name} verwijderen?`)) {
                      void onDelete(item.id).catch(() =>
                        setError("Dit artikel kon niet worden verwijderd."),
                      );
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {canEdit && boughtCount > 0 && (
        <Button
          className="w-full"
          variant="secondary"
          onClick={() => {
            if (
              window.confirm(
                `Wil je ${boughtCount} gekochte artikelen opruimen?`,
              )
            ) {
              void onCleanup().catch(() =>
                setError("Opruimen is niet gelukt."),
              );
            }
          }}
        >
          <Trash2 className="h-4 w-4" />
          Gekochte artikelen opruimen
        </Button>
      )}
    </div>
  );
}
