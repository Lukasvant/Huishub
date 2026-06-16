"use client";

import type { User } from "firebase/auth";
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  type DocumentReference,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { HouseholdRole } from "@/types/models";

function database() {
  if (!db) throw new Error("Firebase is nog niet ingesteld.");
  return db;
}

export async function saveUserProfile(user: User): Promise<void> {
  const firestore = database();
  const profileRef = doc(firestore, "users", user.uid);
  await runTransaction(firestore, async (transaction) => {
    const existing = await transaction.get(profileRef);
    transaction.set(
      profileRef,
      {
        email: user.email?.toLowerCase() ?? "",
        displayName: user.displayName ?? user.email?.split("@")[0] ?? "",
        updatedAt: serverTimestamp(),
        ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
      },
      { merge: true },
    );
  });
}

export async function createHousehold(
  user: User,
  name: string,
): Promise<string> {
  const firestore = database();
  const householdRef = doc(collection(firestore, "households"));
  const memberRef = doc(householdRef, "members", user.uid);
  const batch = writeBatch(firestore);
  const timestamps = {
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  batch.set(householdRef, {
    name: name.trim(),
    createdBy: user.uid,
    ...timestamps,
  });
  batch.set(memberRef, {
    householdId: householdRef.id,
    userId: user.uid,
    email: user.email?.toLowerCase() ?? "",
    displayName: user.displayName ?? user.email?.split("@")[0] ?? "",
    role: "admin",
    ...timestamps,
  });
  await batch.commit();
  return householdRef.id;
}

export async function inviteHouseholdMember(
  householdId: string,
  email: string,
  role: Exclude<HouseholdRole, "admin">,
  createdBy: string,
): Promise<void> {
  const firestore = database();
  const inviteRef = doc(
    collection(firestore, "households", householdId, "invites"),
  );
  await setDoc(inviteRef, {
    householdId,
    email: email.trim().toLowerCase(),
    role,
    status: "pending",
    createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateHouseholdMemberRole(
  householdId: string,
  memberId: string,
  role: HouseholdRole,
): Promise<void> {
  await updateDoc(
    doc(database(), "households", householdId, "members", memberId),
    {
      role,
      updatedAt: serverTimestamp(),
    },
  );
}

export async function leaveHousehold(
  householdId: string,
  userId: string,
): Promise<void> {
  await deleteDoc(
    doc(database(), "households", householdId, "members", userId),
  );
}

export async function removeHouseholdMember(
  householdId: string,
  memberId: string,
): Promise<void> {
  await deleteDoc(
    doc(database(), "households", householdId, "members", memberId),
  );
}

async function collectCollectionDeletes(
  references: DocumentReference[],
  collectionPath: string,
): Promise<void> {
  const snapshot = await getDocs(collection(database(), collectionPath));
  snapshot.docs.forEach((entry) => references.push(entry.ref));
}

export async function deleteHousehold(householdId: string): Promise<void> {
  const firestore = database();
  const references: DocumentReference[] = [];
  const householdRef = doc(firestore, "households", householdId);

  await Promise.all(
    [
      "agendaItems",
      "calendarConnections",
      "groceryItems",
      "invites",
      "members",
      "notifications",
      "tasks",
    ].map((name) =>
      collectCollectionDeletes(references, `households/${householdId}/${name}`),
    ),
  );

  const datePolls = await getDocs(
    collection(firestore, "households", householdId, "datePolls"),
  );
  await Promise.all(
    datePolls.docs.map(async (poll) => {
      const responses = await getDocs(collection(poll.ref, "responses"));
      responses.docs.forEach((response) => references.push(response.ref));
      references.push(poll.ref);
    }),
  );

  const publicOwners = await getDocs(
    query(
      collection(firestore, "publicDatePollOwners"),
      where("householdId", "==", householdId),
    ),
  );
  await Promise.all(
    publicOwners.docs.map(async (owner) => {
      const responses = await getDocs(
        collection(firestore, "publicDatePolls", owner.id, "responses"),
      );
      responses.docs.forEach((response) => references.push(response.ref));
      references.push(doc(firestore, "publicDatePolls", owner.id));
      references.push(owner.ref);
    }),
  );

  references.push(householdRef);
  if (references.length > 450) {
    throw new Error(
      "Dit huishouden bevat te veel gegevens om direct te verwijderen.",
    );
  }

  const batch = writeBatch(firestore);
  references.forEach((reference) => batch.delete(reference));
  await batch.commit();
}

export async function cancelHouseholdInvite(
  householdId: string,
  inviteId: string,
): Promise<void> {
  await deleteDoc(
    doc(database(), "households", householdId, "invites", inviteId),
  );
}

export async function claimPendingInvitations(user: User): Promise<void> {
  const email = user.email?.toLowerCase();
  if (!email) return;
  const firestore = database();
  const invitations = await getDocs(
    query(
      collectionGroup(firestore, "invites"),
      where("email", "==", email),
      where("status", "==", "pending"),
    ),
  );

  await Promise.all(
    invitations.docs.map(async (inviteSnapshot) => {
      const invite = inviteSnapshot.data() as {
        householdId: string;
        role: Exclude<HouseholdRole, "admin">;
        status: string;
      };
      const memberRef = doc(
        firestore,
        "households",
        invite.householdId,
        "members",
        user.uid,
      );
      await runTransaction(firestore, async (transaction) => {
        const latest = await transaction.get(inviteSnapshot.ref);
        if (!latest.exists() || latest.data().status !== "pending") return;
        transaction.set(memberRef, {
          householdId: invite.householdId,
          userId: user.uid,
          email,
          displayName: user.displayName ?? email.split("@")[0],
          role: invite.role,
          inviteId: inviteSnapshot.id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        transaction.update(inviteSnapshot.ref, {
          status: "accepted",
          acceptedBy: user.uid,
          updatedAt: serverTimestamp(),
        });
      });
    }),
  );
}

export async function updateHouseholdName(
  householdId: string,
  name: string,
): Promise<void> {
  const firestore = database();
  await setDoc(
    doc(firestore, "households", householdId),
    { name: name.trim(), updatedAt: serverTimestamp() },
    { merge: true },
  );
}
