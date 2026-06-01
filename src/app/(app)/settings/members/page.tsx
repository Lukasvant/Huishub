"use client";

import { ArrowLeft } from "lucide-react";
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
import { inviteHouseholdMember } from "@/lib/firebase/households";
import { canManageMembers } from "@/lib/permissions";
import type { HouseholdRole } from "@/types/models";

export default function MembersPage() {
  const { user } = useAuth();
  const { household, member } = useHousehold();
  const admin = canManageMembers(member?.role);
  const { items: members, loading, error } = useMembers(household?.id);
  const { items: invites, loading: invitesLoading } = useInvites(
    admin ? household?.id : undefined,
  );
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Exclude<HouseholdRole, "admin">>("partner");
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);

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

  const roleLabel = (value: HouseholdRole) =>
    value === "admin"
      ? "Beheerder"
      : value === "partner"
        ? "Partner · bewerken"
        : "Meekijker · alleen lezen";

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
              <li className="py-3" key={entry.id}>
                <p className="font-medium">
                  {entry.displayName || entry.email}
                </p>
                <p className="text-sm text-muted">{roleLabel(entry.role)}</p>
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
              {message && (
                <Message
                  tone={message.startsWith("Uitnodiging") ? "success" : "error"}
                >
                  {message}
                </Message>
              )}
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
                    <p className="mt-2 text-sm text-muted" key={invite.id}>
                      {invite.email} · {roleLabel(invite.role)}
                    </p>
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
