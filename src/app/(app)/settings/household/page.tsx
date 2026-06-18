"use client";

import Link from "next/link";
import { LogOut, ShieldCheck, Trash2, Users } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button, Card, Message, PageHeader } from "@/components/ui";
import { PushNotificationSettings } from "@/components/push-notification-settings";
import { useAuth } from "@/contexts/auth-context";
import { useHousehold } from "@/contexts/household-context";
import {
  deleteHousehold,
  leaveHousehold,
  updateHouseholdMemberRole,
  updateHouseholdName,
} from "@/lib/firebase/households";
import { canManageMembers } from "@/lib/permissions";
import type { HouseholdMember } from "@/types/models";

export default function HouseholdSettingsPage() {
  const { user } = useAuth();
  const { household, householdNames, member, households, selectHousehold } =
    useHousehold();
  const [nameDraft, setNameDraft] = useState<{
    householdId: string;
    value: string;
  }>();
  const [message, setMessage] = useState<string>();
  const [actionBusy, setActionBusy] = useState<string>();
  const admin = canManageMembers(member?.role, household, user?.uid);
  const ownerNeedsAdminRole = Boolean(
    household && user?.uid === household.createdBy && member?.role !== "admin",
  );

  const name =
    nameDraft && nameDraft.householdId === household?.id
      ? nameDraft.value
      : (household?.name ?? "");

  function householdLabel(entry: HouseholdMember) {
    return householdNames[entry.householdId] ?? "Huishouden laden...";
  }

  function roleLabel(entry: HouseholdMember) {
    if (entry.role === "admin") return "Beheerder";
    if (entry.role === "partner") return "Partner";
    return "Alleen lezen";
  }

  function selectNextHousehold(removedHouseholdId: string) {
    const next = households.find(
      (entry) => entry.householdId !== removedHouseholdId,
    );
    if (next) selectHousehold(next.householdId);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!household) return;
    try {
      await updateHouseholdName(household.id, name);
      setNameDraft(undefined);
      setMessage("De naam is opgeslagen.");
    } catch {
      setMessage("De naam kon niet worden opgeslagen.");
    }
  }

  async function makeMeAdmin() {
    if (!household || !user) return;
    setActionBusy("self-admin");
    setMessage(undefined);
    try {
      await updateHouseholdMemberRole(household.id, user.uid, "admin");
      setMessage("Je bent nu beheerder van dit huishouden.");
    } catch {
      setMessage("Je kon niet als beheerder worden ingesteld.");
    } finally {
      setActionBusy(undefined);
    }
  }

  async function leave(entry: HouseholdMember) {
    if (!user) return;
    const label = householdLabel(entry);
    if (!window.confirm(`${label} verlaten?`)) return;
    setActionBusy(`leave-${entry.householdId}`);
    setMessage(undefined);
    try {
      await leaveHousehold(entry.householdId, user.uid);
      selectNextHousehold(entry.householdId);
      setMessage("Je hebt het huishouden verlaten.");
    } catch {
      setMessage("Het huishouden kon niet worden verlaten.");
    } finally {
      setActionBusy(undefined);
    }
  }

  async function remove(entry: HouseholdMember) {
    const label = householdLabel(entry);
    if (
      !window.confirm(
        `${label} volledig verwijderen? Alle taken, boodschappen, agenda-items en datumprikkers van dit huishouden worden verwijderd.`,
      )
    ) {
      return;
    }
    setActionBusy(`delete-${entry.householdId}`);
    setMessage(undefined);
    try {
      await deleteHousehold(entry.householdId);
      selectNextHousehold(entry.householdId);
      setMessage("Het huishouden is verwijderd.");
    } catch {
      setMessage("Het huishouden kon niet worden verwijderd.");
    } finally {
      setActionBusy(undefined);
    }
  }

  const messageTone = message?.includes("kon") ? "error" : "success";

  return (
    <>
      <PageHeader title="Instellingen" description="Huishouden en toegang." />
      <div className="grid max-w-2xl gap-4">
        {user && <PushNotificationSettings userId={user.uid} />}
        <Card>
          <h2 className="font-semibold">Huishouden</h2>
          {admin ? (
            <form
              className="mt-4 flex flex-col gap-2 sm:flex-row"
              onSubmit={save}
            >
              <input
                aria-label="Naam huishouden"
                className="field"
                value={name}
                onChange={(event) =>
                  household &&
                  setNameDraft({
                    householdId: household.id,
                    value: event.target.value,
                  })
                }
              />
              <Button type="submit">Opslaan</Button>
            </form>
          ) : (
            <p className="mt-2 text-sm text-muted">{household?.name}</p>
          )}
          {ownerNeedsAdminRole && (
            <Button
              className="mt-3"
              disabled={Boolean(actionBusy)}
              type="button"
              variant="secondary"
              onClick={() => void makeMeAdmin()}
            >
              <ShieldCheck className="h-4 w-4" />
              Maak mij beheerder
            </Button>
          )}
          {message && (
            <div className="mt-3">
              <Message tone={messageTone}>{message}</Message>
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
        <Card>
          <h2 className="font-semibold">Huishoudens beheren</h2>
          <p className="mt-1 text-sm text-muted">
            Ruim testhuishoudens op of verlaat huishoudens die je niet meer
            gebruikt.
          </p>
          <div className="mt-4 space-y-2">
            {households.map((entry) => {
              const current = entry.householdId === household?.id;
              const currentOwner = Boolean(
                current && household?.createdBy === user?.uid,
              );
              const canDeleteEntry = entry.role === "admin" || currentOwner;
              return (
                <div
                  className="rounded-2xl border border-line bg-canvas p-3"
                  key={entry.householdId}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">
                        {householdLabel(entry)}
                        {current && (
                          <span className="ml-2 text-xs text-muted">
                            actief
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-muted">{roleLabel(entry)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!current && (
                        <Button
                          disabled={Boolean(actionBusy)}
                          type="button"
                          variant="secondary"
                          onClick={() => selectHousehold(entry.householdId)}
                        >
                          Open
                        </Button>
                      )}
                      {canDeleteEntry ? (
                        <Button
                          disabled={Boolean(actionBusy)}
                          type="button"
                          variant="danger"
                          onClick={() => void remove(entry)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Verwijder
                        </Button>
                      ) : (
                        <Button
                          disabled={Boolean(actionBusy)}
                          type="button"
                          variant="ghost"
                          onClick={() => void leave(entry)}
                        >
                          <LogOut className="h-4 w-4" />
                          Verlaat
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
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
