"use client";

import {
  collection,
  onSnapshot,
  query,
  where,
  type QueryConstraint,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/client";
import type {
  AgendaItem,
  GroceryItem,
  HouseholdInvite,
  HouseholdMember,
  HouseholdRole,
  Task,
} from "@/types/models";

interface DataResult<T> {
  items: T[];
  loading: boolean;
  error?: string;
}

function useLiveCollection<T>(
  householdId: string | undefined,
  collectionName: string,
  constraints: QueryConstraint[],
  dependency: string,
): DataResult<T> {
  const [items, setItems] = useState<T[]>([]);
  const [loadedKey, setLoadedKey] = useState<string>();
  const [error, setError] = useState<string>();
  const key = `${householdId ?? "none"}/${collectionName}/${dependency}`;
  const active = Boolean(householdId && db);

  useEffect(() => {
    if (!householdId || !db) {
      return;
    }
    const collectionRef = collection(
      db,
      "households",
      householdId,
      collectionName,
    );
    const liveQuery = query(collectionRef, ...constraints);
    return onSnapshot(
      liveQuery,
      (snapshot) => {
        setItems(
          snapshot.docs.map(
            (document) => ({ id: document.id, ...document.data() }) as T,
          ),
        );
        setLoadedKey(key);
        setError(undefined);
      },
      () => {
        setError("Gegevens konden niet worden geladen.");
        setLoadedKey(key);
      },
    );
    // Constraints are intentionally rebuilt from the primitive dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName, dependency, householdId, key]);

  return {
    items: active ? items : [],
    loading: active && loadedKey !== key,
    error: active ? error : undefined,
  };
}

export function useTasks(
  householdId?: string,
  role?: HouseholdRole,
): DataResult<Task> {
  const constraints =
    role === "viewer" ? [where("visibleToViewers", "==", true)] : [];
  return useLiveCollection<Task>(
    householdId,
    "tasks",
    constraints,
    role ?? "none",
  );
}

export function useGroceries(householdId?: string): DataResult<GroceryItem> {
  return useLiveCollection<GroceryItem>(
    householdId,
    "groceryItems",
    [],
    "groceries",
  );
}

export function useAgendaItems(
  householdId?: string,
  role?: HouseholdRole,
): DataResult<AgendaItem> {
  const constraints = role === "viewer" ? [where("private", "==", false)] : [];
  return useLiveCollection<AgendaItem>(
    householdId,
    "agendaItems",
    constraints,
    role ?? "none",
  );
}

export function useMembers(householdId?: string): DataResult<HouseholdMember> {
  return useLiveCollection<HouseholdMember>(
    householdId,
    "members",
    [],
    "members",
  );
}

export function useInvites(householdId?: string): DataResult<HouseholdInvite> {
  return useLiveCollection<HouseholdInvite>(
    householdId,
    "invites",
    [],
    "invites",
  );
}
