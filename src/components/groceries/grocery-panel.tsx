"use client";

import {
  Apple,
  Baby,
  Banana,
  Beef,
  Check,
  Coffee,
  Croissant,
  Egg,
  Fish,
  LeafyGreen,
  Milk,
  Package,
  PillBottle,
  Plus,
  SoapDispenserDroplet,
  SprayCan,
  Trash2,
  Wheat,
  type LucideIcon,
} from "lucide-react";
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

interface GroceryTemplate extends NewGroceryInput {
  icon: LucideIcon;
}

const quickItems: GroceryTemplate[] = [
  { name: "Melk", category: "zuivel", icon: Milk },
  { name: "Brood", category: "brood", icon: Croissant },
  { name: "Eieren", category: "overig", icon: Egg },
  { name: "Bananen", category: "groente", icon: Banana },
  { name: "Appels", category: "groente", icon: Apple },
  { name: "Yoghurt", category: "zuivel", icon: Milk },
  { name: "Luiers", category: "baby", icon: Baby },
  {
    name: "Billendoekjes",
    category: "drogist",
    shopLabel: "Kruidvat",
    icon: SoapDispenserDroplet,
  },
  { name: "Koffie", category: "overig", icon: Coffee },
  { name: "Pasta", category: "overig", icon: Wheat },
  { name: "Vlees", category: "vlees", icon: Beef },
  { name: "Vis", category: "vlees", icon: Fish },
];

const categories: Array<{ value: GroceryCategory; label: string }> = [
  { value: "groente", label: "Groente" },
  { value: "zuivel", label: "Zuivel" },
  { value: "baby", label: "Baby" },
  { value: "drogist", label: "Drogist" },
  { value: "brood", label: "Brood" },
  { value: "vlees", label: "Vlees" },
  { value: "overig", label: "Overig" },
];

const categoryLabels = Object.fromEntries(
  categories.map((entry) => [entry.value, entry.label]),
) as Record<GroceryCategory, string>;

const categoryIcons: Record<GroceryCategory, LucideIcon> = {
  groente: LeafyGreen,
  zuivel: Milk,
  baby: Baby,
  drogist: PillBottle,
  brood: Croissant,
  vlees: Beef,
  overig: Package,
};

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

function iconForItem(item: Pick<GroceryItem, "name" | "category">): LucideIcon {
  const name = normalizeName(item.name);
  if (/melk|yoghurt|kaas|kwark/.test(name)) return Milk;
  if (/brood|croissant|bol/.test(name)) return Croissant;
  if (/ei|eieren/.test(name)) return Egg;
  if (/banaan|bananen/.test(name)) return Banana;
  if (/appel|appels/.test(name)) return Apple;
  if (/luier/.test(name)) return Baby;
  if (/doekjes|zeep/.test(name)) return SoapDispenserDroplet;
  if (/koffie/.test(name)) return Coffee;
  if (/pasta|rijst/.test(name)) return Wheat;
  if (/vlees|kip|gehakt/.test(name)) return Beef;
  if (/vis|zalm/.test(name)) return Fish;
  if (/shampoo|spray/.test(name)) return SprayCan;
  return item.category ? categoryIcons[item.category] : Package;
}

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
  const [notice, setNotice] = useState<string>();
  const boughtCount = items.filter((item) => item.status === "bought").length;
  const ordered = [...items].sort((left, right) =>
    left.status === right.status ? 0 : left.status === "needed" ? -1 : 1,
  );
  const neededItems = ordered.filter((item) => item.status === "needed");
  const boughtItems = ordered.filter((item) => item.status === "bought");

  async function add(item: NewGroceryInput): Promise<boolean> {
    setBusy(true);
    setError(undefined);
    setNotice(undefined);
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

  async function tapQuickItem(template: GroceryTemplate) {
    const existing = items.find(
      (item) => normalizeName(item.name) === normalizeName(template.name),
    );
    setError(undefined);
    setNotice(undefined);

    if (existing?.status === "needed") {
      setNotice(`${template.name} staat al op de lijst.`);
      return;
    }

    setBusy(true);
    try {
      if (existing) {
        await onToggle(existing);
        setNotice(`${template.name} staat weer op de lijst.`);
      } else {
        await onAdd({
          name: template.name,
          ...(template.quantity ? { quantity: template.quantity } : {}),
          ...(template.unit ? { unit: template.unit } : {}),
          ...(template.shopLabel ? { shopLabel: template.shopLabel } : {}),
          ...(template.category ? { category: template.category } : {}),
        });
        setNotice(`${template.name} toegevoegd.`);
      }
    } catch {
      setError("Dit artikel kon niet worden toegevoegd.");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(item: GroceryItem) {
    setError(undefined);
    setNotice(undefined);
    try {
      await onToggle(item);
    } catch {
      setError("De gekocht-status kon niet worden bijgewerkt.");
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
        <div className="rounded-[1.75rem] border border-line bg-panel p-4 shadow-calm">
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
            aria-label="Snel toevoegen"
            className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4"
          >
            {quickItems.map(({ icon: Icon, ...item }) => (
              <button
                aria-label={`${item.name} snel toevoegen`}
                className="group min-h-24 rounded-2xl border border-line bg-canvas px-2.5 py-3 text-center transition hover:-translate-y-0.5 hover:border-sage-500 hover:bg-sage-50"
                disabled={busy}
                key={item.name}
                onClick={() => tapQuickItem({ ...item, icon: Icon })}
                type="button"
              >
                <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-panel text-sage-600 shadow-sm transition group-hover:bg-white">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="mt-2 block truncate text-xs font-semibold text-ink">
                  {item.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
      {error && <Message>{error}</Message>}
      {notice && <Message tone="success">{notice}</Message>}
      {items.length === 0 ? (
        <EmptyState
          title="De lijst is leeg"
          text={
            canEdit
              ? "Tik op een icoon of typ iets voor de volgende boodschap."
              : "Er staan nu geen boodschappen op de lijst."
          }
        />
      ) : (
        <div className="space-y-5">
          {neededItems.length > 0 && (
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-[0.14em]">
                  Nog nodig
                </h2>
                <span className="text-sm text-muted">{neededItems.length}</span>
              </div>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {neededItems.map((item) => (
                  <GroceryTile
                    canEdit={canEdit}
                    item={item}
                    key={item.id}
                    onDelete={onDelete}
                    onError={setError}
                    onToggle={toggle}
                  />
                ))}
              </ul>
            </section>
          )}
          {boughtItems.length > 0 && (
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted">
                  Gekocht
                </h2>
                <span className="text-sm text-muted">{boughtItems.length}</span>
              </div>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {boughtItems.map((item) => (
                  <GroceryTile
                    canEdit={canEdit}
                    item={item}
                    key={item.id}
                    onDelete={onDelete}
                    onError={setError}
                    onToggle={toggle}
                  />
                ))}
              </ul>
            </section>
          )}
        </div>
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

function GroceryTile({
  item,
  canEdit,
  onToggle,
  onDelete,
  onError,
}: {
  item: GroceryItem;
  canEdit: boolean;
  onToggle: (item: GroceryItem) => Promise<void>;
  onDelete: (itemId: string) => Promise<void>;
  onError: (message: string) => void;
}) {
  const Icon = iconForItem(item);
  const bought = item.status === "bought";
  const detail = [
    item.quantity,
    item.unit,
    item.shopLabel,
    item.category ? categoryLabels[item.category] : undefined,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li
      className={clsx(
        "relative min-h-32 rounded-[1.5rem] border transition",
        bought
          ? "border-sage-100 bg-sage-50 text-muted"
          : "border-line bg-panel text-ink shadow-calm",
      )}
    >
      {canEdit && (
        <button
          aria-label={`${item.name} verwijderen`}
          className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-red-50 hover:text-red-700"
          type="button"
          onClick={() => {
            if (window.confirm(`${item.name} verwijderen?`)) {
              void onDelete(item.id).catch(() =>
                onError("Dit artikel kon niet worden verwijderd."),
              );
            }
          }}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
      {canEdit ? (
        <button
          aria-label={
            bought ? `${item.name} terugzetten` : `${item.name} gekocht`
          }
          className="flex h-full min-h-32 w-full flex-col items-start rounded-[1.5rem] p-3 text-left"
          type="button"
          onClick={() => void onToggle(item)}
        >
          <TileContent
            Icon={Icon}
            bought={bought}
            detail={detail}
            item={item}
          />
        </button>
      ) : (
        <div className="flex h-full min-h-32 w-full flex-col items-start rounded-[1.5rem] p-3 text-left">
          <TileContent
            Icon={Icon}
            bought={bought}
            detail={detail}
            item={item}
          />
        </div>
      )}
    </li>
  );
}

function TileContent({
  Icon,
  bought,
  detail,
  item,
}: {
  Icon: LucideIcon;
  bought: boolean;
  detail: string;
  item: GroceryItem;
}) {
  return (
    <>
      <span
        className={clsx(
          "flex h-11 w-11 items-center justify-center rounded-2xl",
          bought ? "bg-white/70 text-sage-600" : "bg-sage-50 text-sage-600",
        )}
      >
        {bought ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
      </span>
      <span className="mt-3 block pr-7 font-medium">{item.name}</span>
      {detail && (
        <span className="mt-1 block text-xs text-muted">{detail}</span>
      )}
    </>
  );
}
