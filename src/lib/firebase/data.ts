"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { nextOccurrence } from "@/lib/tasks/recurrence";
import type {
  GroceryCategory,
  ParsedGroceryItem,
  Recurrence,
  Task,
  TaskCategory,
} from "@/types/models";

function database() {
  if (!db) throw new Error("Firebase is nog niet ingesteld.");
  return db;
}

function omitUndefined(
  input: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  );
}

export interface NewTaskInput {
  title: string;
  description?: string;
  assignedTo?: string;
  dueDate?: Date;
  category: TaskCategory;
  recurrence?: Recurrence;
  visibleToViewers: boolean;
}

export async function createTask(
  householdId: string,
  userId: string,
  input: NewTaskInput,
): Promise<void> {
  const dueDate =
    input.dueDate ??
    (input.recurrence
      ? nextOccurrence(input.recurrence, new Date())
      : undefined);
  await addDoc(collection(database(), "households", householdId, "tasks"), {
    ...omitUndefined(input as unknown as Record<string, unknown>),
    householdId,
    title: input.title.trim(),
    ...(dueDate ? { dueDate: Timestamp.fromDate(dueDate) } : {}),
    status: "open",
    createdBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateTask(
  householdId: string,
  taskId: string,
  input: NewTaskInput,
): Promise<void> {
  await updateDoc(doc(database(), "households", householdId, "tasks", taskId), {
    ...omitUndefined(input as unknown as Record<string, unknown>),
    title: input.title.trim(),
    description: input.description ?? null,
    assignedTo: input.assignedTo ?? null,
    dueDate: input.dueDate ? Timestamp.fromDate(input.dueDate) : null,
    recurrence: input.recurrence ?? null,
    updatedAt: serverTimestamp(),
  });
}

export async function toggleTaskDone(
  householdId: string,
  task: Task,
): Promise<void> {
  const taskRef = doc(database(), "households", householdId, "tasks", task.id);
  if (task.status === "done") {
    await updateDoc(taskRef, {
      status: "open",
      completedAt: null,
      updatedAt: serverTimestamp(),
    });
    return;
  }
  if (task.recurrence) {
    const base = task.dueDate
      ? task.dueDate instanceof Date
        ? task.dueDate
        : task.dueDate.toDate()
      : new Date();
    await updateDoc(taskRef, {
      status: "open",
      completedAt: serverTimestamp(),
      dueDate: Timestamp.fromDate(nextOccurrence(task.recurrence, base)),
      updatedAt: serverTimestamp(),
    });
    return;
  }
  await updateDoc(taskRef, {
    status: "done",
    completedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTask(
  householdId: string,
  taskId: string,
): Promise<void> {
  await deleteDoc(doc(database(), "households", householdId, "tasks", taskId));
}

export interface NewGroceryInput extends ParsedGroceryItem {
  category?: GroceryCategory;
  notifyHousehold?: boolean;
}

export async function createGroceryItem(
  householdId: string,
  userId: string,
  input: NewGroceryInput,
): Promise<void> {
  await addDoc(
    collection(database(), "households", householdId, "groceryItems"),
    {
      ...omitUndefined(input as unknown as Record<string, unknown>),
      householdId,
      name: input.name.trim(),
      status: "needed",
      boughtColorState: "needed",
      addedBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
  );
}

export async function toggleGroceryBought(
  householdId: string,
  itemId: string,
  bought: boolean,
): Promise<void> {
  await updateDoc(
    doc(database(), "households", householdId, "groceryItems", itemId),
    {
      status: bought ? "bought" : "needed",
      boughtColorState: bought ? "bought" : "needed",
      boughtAt: bought ? serverTimestamp() : null,
      updatedAt: serverTimestamp(),
    },
  );
}

export async function cleanBoughtGroceries(householdId: string): Promise<void> {
  const firestore = database();
  const boughtItems = await getDocs(
    query(
      collection(firestore, "households", householdId, "groceryItems"),
      where("status", "==", "bought"),
    ),
  );
  const batch = writeBatch(firestore);
  boughtItems.docs.forEach((item) => batch.delete(item.ref));
  await batch.commit();
}

export async function deleteGroceryItem(
  householdId: string,
  itemId: string,
): Promise<void> {
  await deleteDoc(
    doc(database(), "households", householdId, "groceryItems", itemId),
  );
}

export interface NewAgendaInput {
  title: string;
  description?: string;
  startDateTime: Date;
  endDateTime?: Date;
  allDay: boolean;
  location?: string;
  private: boolean;
  source?: "manual" | "photo_ocr";
}

export async function createAgendaItem(
  householdId: string,
  userId: string,
  input: NewAgendaInput,
): Promise<void> {
  await addDoc(
    collection(database(), "households", householdId, "agendaItems"),
    {
      ...omitUndefined(input as unknown as Record<string, unknown>),
      householdId,
      title: input.title.trim(),
      startDateTime: Timestamp.fromDate(input.startDateTime),
      ...(input.endDateTime
        ? { endDateTime: Timestamp.fromDate(input.endDateTime) }
        : {}),
      visibleToViewers: !input.private,
      source: input.source ?? "manual",
      createdBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
  );
}

export async function createAgendaItems(
  householdId: string,
  userId: string,
  inputs: NewAgendaInput[],
): Promise<void> {
  if (inputs.length === 0) return;
  const firestore = database();
  const batch = writeBatch(firestore);
  const agendaCollection = collection(
    firestore,
    "households",
    householdId,
    "agendaItems",
  );

  inputs.forEach((input) => {
    batch.set(doc(agendaCollection), {
      ...omitUndefined(input as unknown as Record<string, unknown>),
      householdId,
      title: input.title.trim(),
      startDateTime: Timestamp.fromDate(input.startDateTime),
      ...(input.endDateTime
        ? { endDateTime: Timestamp.fromDate(input.endDateTime) }
        : {}),
      visibleToViewers: !input.private,
      source: input.source ?? "manual",
      createdBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
}

export async function updateAgendaItem(
  householdId: string,
  itemId: string,
  input: NewAgendaInput,
): Promise<void> {
  await updateDoc(
    doc(database(), "households", householdId, "agendaItems", itemId),
    {
      ...omitUndefined(input as unknown as Record<string, unknown>),
      title: input.title.trim(),
      description: input.description ?? null,
      startDateTime: Timestamp.fromDate(input.startDateTime),
      endDateTime: input.endDateTime
        ? Timestamp.fromDate(input.endDateTime)
        : null,
      visibleToViewers: !input.private,
      location: input.location ?? null,
      updatedAt: serverTimestamp(),
    },
  );
}

export async function deleteAgendaItem(
  householdId: string,
  itemId: string,
): Promise<void> {
  await deleteDoc(
    doc(database(), "households", householdId, "agendaItems", itemId),
  );
}
