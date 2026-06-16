"use client";

import { addDays } from "date-fns";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type {
  DatePollChoice,
  DatePollSlot,
  PublicDatePoll,
} from "@/types/models";

function database() {
  if (!db) throw new Error("Firebase is nog niet ingesteld.");
  return db;
}

function optionalText(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function storedSlot(slot: DatePollSlot) {
  return {
    id: slot.id,
    startDateTime: Timestamp.fromDate(
      slot.startDateTime instanceof Date
        ? slot.startDateTime
        : slot.startDateTime.toDate(),
    ),
    endDateTime: Timestamp.fromDate(
      slot.endDateTime instanceof Date
        ? slot.endDateTime
        : slot.endDateTime.toDate(),
    ),
  };
}

export interface CreateDatePollInput {
  title: string;
  description?: string;
  location?: string;
  durationMinutes: number;
  rangeStart: Date;
  rangeEnd: Date;
  candidateSlots: DatePollSlot[];
}

export async function createDatePoll(
  householdId: string,
  userId: string,
  input: CreateDatePollInput,
): Promise<{ pollId: string; publicId: string }> {
  const firestore = database();
  const pollRef = doc(
    collection(firestore, "households", householdId, "datePolls"),
  );
  const publicRef = doc(collection(firestore, "publicDatePolls"));
  const ownerRef = doc(firestore, "publicDatePollOwners", publicRef.id);
  const slots = input.candidateSlots.map(storedSlot);
  const base = {
    householdId,
    title: input.title.trim(),
    ...(optionalText(input.description)
      ? { description: optionalText(input.description) }
      : {}),
    ...(optionalText(input.location)
      ? { location: optionalText(input.location) }
      : {}),
    status: "open",
    publicId: publicRef.id,
    durationMinutes: input.durationMinutes,
    timeZone: "Europe/Amsterdam",
    rangeStart: Timestamp.fromDate(input.rangeStart),
    rangeEnd: Timestamp.fromDate(input.rangeEnd),
    candidateSlots: slots,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const batch = writeBatch(firestore);
  batch.set(pollRef, {
    ...base,
    createdBy: userId,
  });
  batch.set(publicRef, {
    title: base.title,
    ...(base.description ? { description: base.description } : {}),
    ...(base.location ? { location: base.location } : {}),
    status: "open",
    candidateSlots: slots,
    expiresAt: Timestamp.fromDate(addDays(input.rangeEnd, 30)),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(ownerRef, {
    householdId,
    pollId: pollRef.id,
    createdBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
  return { pollId: pollRef.id, publicId: publicRef.id };
}

export async function getPublicDatePoll(
  publicId: string,
): Promise<PublicDatePoll | undefined> {
  const snapshot = await getDoc(doc(database(), "publicDatePolls", publicId));
  if (!snapshot.exists()) return undefined;
  return { id: snapshot.id, ...snapshot.data() } as PublicDatePoll;
}

export function subscribePublicDatePoll(
  publicId: string,
  onNext: (poll: PublicDatePoll | undefined) => void,
  onError: () => void,
): Unsubscribe {
  return onSnapshot(
    doc(database(), "publicDatePolls", publicId),
    (snapshot) => {
      onNext(
        snapshot.exists()
          ? ({ id: snapshot.id, ...snapshot.data() } as PublicDatePoll)
          : undefined,
      );
    },
    onError,
  );
}

export async function createPublicDatePollResponse(
  publicId: string,
  input: {
    name: string;
    email?: string;
    choices: Record<string, DatePollChoice>;
  },
): Promise<void> {
  await addDoc(
    collection(database(), "publicDatePolls", publicId, "responses"),
    {
      name: input.name.trim(),
      ...(optionalText(input.email)
        ? { email: optionalText(input.email) }
        : {}),
      choices: input.choices,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
  );
}
