"use client";

import { ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  Button,
  Card,
  LoadingScreen,
  Message,
  PageHeader,
} from "@/components/ui";
import { useAuth } from "@/contexts/auth-context";
import { useHousehold } from "@/contexts/household-context";
import { useInvites, useMembers } from "@/hooks/use-household-data";
import {
  cancelHouseholdInvite,
  inviteHouseholdMember,
  removeHouseholdMember,
  updateHouseholdMemberRole,
} from "@/lib/firebase/households";
import { canManageMembers } from "@/lib/permissions";
import type { HouseholdRole } from "@/types/models";

export default function MembersPage() {
  const { user } = useAuth();
  const { household, member } = useHousehold();
  const admin = canManageMembers(member?.role, household, user?.uid);
  const { items: members, loading, error } = useMembers(household?.id);
  const { items: invites, loading: invitesLoading } = useInvites(
    admin ? household?.id : undefined,
  );
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Exclude<HouseholdRole, "admin">>("partner");
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState<string>();

  async function invite(event: FormEvent) {
    event.preventDefault();
    if (!household || !user) return;
    setBusy(true);
    try {
      await inviteHouseholdMember(household.id, email, role, user.uid);
      setEmail("");
      setMessage(
        "Uitnodiging klaargezet. Na inloggen met dit e-mailadres wordt toegang geactiveerd.",
      );
    } catch {
      setMessage("De uitnodiging kon niet worden gemaakt.");
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(memberId: string, nextRole: HouseholdRole) {
    if (!household || !admin) return;
    setActionBusy(`role-${memberId}`);
    setMessage(undefined);
    try {
      await updateHouseholdMemberRole(household.id, memberId, nextRole);
      setMessage("De rol is bijgewerkt.");
    } catch {
      setMessage("De rol kon niet worden bijgewerkt.");
    } finally {
      setActionBusy(undefined);
    }
  }

  async function removeMember(memberId: string, label: string) {
    if (!household || !admin) return;
    if (!window.confirm(`${label} verwijderen uit dit huishouden?`)) return;
    setActionBusy(`remove-${memberId}`);
    setMessage(undefined);
    try {
      await removeHouseholdMember(household.id, memberId);
      setMessage("Het lid is verwijderd.");
    } catch {
      setMessage("Het lid kon niet worden verwijderd.");
    } finally {
      setActionBusy(undefined);
    }
  }

  async function cancelInvite(inviteId: string, inviteEmail: string) {
    if (!household || !admin) return;
    if (!window.confirm(`Uitnodiging voor ${inviteEmail} intrekken?`)) return;
    setActionBusy(`invite-${inviteId}`);
    setMessage(undefined);
    try {
      await cancelHouseholdInvite(household.id, inviteId);
      setMessage("De uitnodiging is ingetrokken.");
    } catch {
      setMessage("De uitnodiging kon niet worden ingetrokken.");
    } finally {
      setActionBusy(undefined);
    }
  }

  const roleLabel = (value: HouseholdRole) =>
    value === "admin"
      ? "Beheerder"
      : value === "partner"
        ? "Partner · bewerken"
        : "Meekijker · alleen lezen";
  const messageTone = message?.includes("kon") ? "error" : "success";

  if (loading || (admin && invitesLoading)) {
    return <LoadingScreen text="Leden laden..." />;
  }

  return (
    <>
      <PageHeader
        title="Leden"
        description="Bepaal wie kan bewerken en wie alleen meekijkt."
        action={
          <Link href="/settings/household">
            <Button variant="ghost">
              <ArrowLeft className="h-4 w-4" />
              Terug
            </Button>
          </Link>
        }
      />
      <div className="grid max-w-3xl items-start gap-4 md:grid-cols-2">
        <Card>
          <h2 className="font-semibold">Toegang</h2>
          {error && <Message>{error}</Message>}
          <ul className="mt-3 divide-y divide-stone-100">
            {members.map((entry) => (
              <li
                className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                key={entry.id}
              >
                <div>
                  <p className="font-medium">
                    {entry.displayName || entry.email}
                    {entry.userId === user?.uid && (
                      <span className="ml-2 text-xs text-muted">jij</span>
                    )}
                  </p>
                  <p className="text-sm text-muted">{roleLabel(entry.role)}</p>
                </div>
                {admin &&
                  entry.userId !== user?.uid &&
                  entry.role !== "admin" && (
                    <div className="flex gap-2">
                      <select
                        aria-label={`Rol voor ${entry.email}`}
                        className="field min-h-11 py-2 text-sm"
                        disabled={Boolean(actionBusy)}
                        value={entry.role}
                        onChange={(event) =>
                          void changeRole(
                            entry.id,
                            event.target.value as HouseholdRole,
                          )
                        }
                      >
                        <option value="admin">Beheerder</option>
                        <option value="partner">Partner</option>
                        <option value="viewer">Alleen lezen</option>
                      </select>
                      <Button
                        aria-label={`${entry.email} verwijderen`}
                        className="px-3"
                        disabled={Boolean(actionBusy)}
                        type="button"
                        variant="ghost"
                        onClick={() =>
                          void removeMember(
                            entry.id,
                            entry.displayName || entry.email,
                          )
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
              </li>
            ))}
          </ul>
        </Card>
        {admin ? (
          <Card>
            <h2 className="font-semibold">Iemand uitnodigen</h2>
            <form className="mt-4 space-y-3" onSubmit={invite}>
              <label>
                <span className="label">E-mailadres</span>
                <input
                  className="field"
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <label>
                <span className="label">Rol</span>
                <select
                  className="field"
                  value={role}
                  onChange={(event) =>
                    setRole(
                      event.target.value as Exclude<HouseholdRole, "admin">,
                    )
                  }
                >
                  <option value="partner">Partner · kan bewerken</option>
                  <option value="viewer">Oppas/familie · alleen lezen</option>
                </select>
              </label>
              {message && <Message tone={messageTone}>{message}</Message>}
              <Button className="w-full" disabled={busy} type="submit">
                {busy ? "Uitnodigen..." : "Uitnodiging maken"}
              </Button>
            </form>
            {invites.filter((invite) => invite.status === "pending").length >
              0 && (
              <div className="mt-5 border-t border-stone-100 pt-4">
                <h3 className="text-sm font-medium">Open uitnodigingen</h3>
                {invites
                  .filter((invite) => invite.status === "pending")
                  .map((invite) => (
                    <div
                      className="mt-2 flex items-center justify-between gap-2 text-sm text-muted"
                      key={invite.id}
                    >
                      <p>
                        {invite.email} · {roleLabel(invite.role)}
                      </p>
                      <Button
                        aria-label={`Uitnodiging voor ${invite.email} intrekken`}
                        className="px-3"
                        disabled={Boolean(actionBusy)}
                        type="button"
                        variant="ghost"
                        onClick={() =>
                          void cancelInvite(invite.id, invite.email)
                        }
                      >
                        Intrekken
                      </Button>
                    </div>
                  ))}
              </div>
            )}
          </Card>
        ) : (
          <Message tone="info">
            Alleen de beheerder kan uitnodigingen beheren.
          </Message>
        )}
      </div>
    </>
  );
}
