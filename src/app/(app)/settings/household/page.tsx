"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button, Card, Message, PageHeader } from "@/components/ui";
import { useHousehold } from "@/contexts/household-context";
import { updateHouseholdName } from "@/lib/firebase/households";
import { canManageMembers } from "@/lib/permissions";

export default function HouseholdSettingsPage() {
  const { household, householdNames, member, households, selectHousehold } =
    useHousehold();
  const [name, setName] = useState(household?.name ?? "");
  const [message, setMessage] = useState<string>();
  const admin = canManageMembers(member?.role);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!household) return;
    try {
      await updateHouseholdName(household.id, name);
      setMessage("De naam is opgeslagen.");
    } catch {
      setMessage("De naam kon niet worden opgeslagen.");
    }
  }

  return (
    <>
      <PageHeader title="Instellingen" description="Huishouden en toegang." />
      <div className="grid max-w-2xl gap-4">
        <Card>
          <h2 className="font-semibold">Huishouden</h2>
          {admin ? (
            <form className="mt-4 flex gap-2" onSubmit={save}>
              <input
                aria-label="Naam huishouden"
                className="field"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              <Button type="submit">Opslaan</Button>
            </form>
          ) : (
            <p className="mt-2 text-sm text-muted">{household?.name}</p>
          )}
          {message && (
            <div className="mt-3">
              <Message
                tone={message.includes("opgeslagen") ? "success" : "error"}
              >
                {message}
              </Message>
            </div>
          )}
          {households.length > 1 && (
            <label className="mt-4 block">
              <span className="label">Wissel huishouden</span>
              <select
                className="field"
                value={household?.id}
                onChange={(event) => selectHousehold(event.target.value)}
              >
                {households.map((entry) => (
                  <option key={entry.householdId} value={entry.householdId}>
                    {householdNames[entry.householdId] ??
                      (entry.householdId === household?.id
                        ? household.name
                        : "Huishouden laden...")}
                  </option>
                ))}
              </select>
            </label>
          )}
        </Card>
        <Link href="/settings/members">
          <Card className="flex items-center justify-between transition hover:bg-stone-50">
            <div>
              <h2 className="font-semibold">Leden en toegang</h2>
              <p className="mt-1 text-sm text-muted">
                Partner of meekijker uitnodigen.
              </p>
            </div>
            <Users className="h-5 w-5 text-muted" />
          </Card>
        </Link>
      </div>
    </>
  );
}
