"use client";

import {
  collectionGroup,
  doc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase/client";
import {
  claimPendingInvitations,
  createHousehold,
} from "@/lib/firebase/households";
import type { Household, HouseholdMember } from "@/types/models";

interface HouseholdContextValue {
  households: HouseholdMember[];
  householdNames: Record<string, string>;
  household?: Household;
  member?: HouseholdMember;
  loading: boolean;
  error?: string;
  retryLoading: () => void;
  selectHousehold: (householdId: string) => void;
  createNewHousehold: (name: string) => Promise<void>;
}

const HouseholdContext = createContext<HouseholdContextValue | undefined>(
  undefined,
);
const selectedKey = "taskhive-selected-household";
const legacySelectedKey = "huishub-selected-household";

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [households, setHouseholds] = useState<HouseholdMember[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [household, setHousehold] = useState<Household>();
  const [householdNames, setHouseholdNames] = useState<Record<string, string>>(
    {},
  );
  const [loadedForUser, setLoadedForUser] = useState<string>();
  const [error, setError] = useState<string>();
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    if (!user || !db) {
      return;
    }

    let unsubscribe: (() => void) | undefined;
    claimPendingInvitations(user)
      .catch(() =>
        setError("Een uitnodiging kon niet automatisch worden geaccepteerd."),
      )
      .finally(() => {
        if (!db) return;
        unsubscribe = onSnapshot(
          query(
            collectionGroup(db, "members"),
            where("userId", "==", user.uid),
          ),
          (snapshot) => {
            const memberships = snapshot.docs.map(
              (entry) => ({ id: entry.id, ...entry.data() }) as HouseholdMember,
            );
            setError(undefined);
            setHouseholds(memberships);
            const saved =
              typeof window !== "undefined"
                ? (localStorage.getItem(selectedKey) ??
                  localStorage.getItem(legacySelectedKey))
                : undefined;
            const preferred = memberships.find(
              (membership) => membership.householdId === saved,
            );
            setSelectedId(
              preferred?.householdId ?? memberships[0]?.householdId,
            );
            setLoadedForUser(user.uid);
          },
          (reason) => {
            const message =
              reason.code === "permission-denied"
                ? "Firebase weigert toegang tot huishoudens. Probeer opnieuw; blijft dit staan, dan lossen we de toegangsregels op."
                : reason.code === "failed-precondition"
                  ? "Firebase is de huishoudgegevens nog aan het voorbereiden. Probeer opnieuw."
                  : "Huishoudens konden niet worden geladen. Probeer opnieuw.";
            setError(message);
            setLoadedForUser(user.uid);
          },
        );
      });

    return () => unsubscribe?.();
  }, [loadAttempt, user]);

  useEffect(() => {
    if (!selectedId || !db) {
      return;
    }
    return onSnapshot(
      doc(db, "households", selectedId),
      (snapshot) => {
        if (snapshot.exists()) {
          setHousehold({ id: snapshot.id, ...snapshot.data() } as Household);
        }
      },
      () => setError("Het gekozen huishouden kon niet worden geladen."),
    );
  }, [selectedId]);

  const currentUserLoaded = Boolean(user && loadedForUser === user.uid);

  useEffect(() => {
    if (!currentUserLoaded || !db || households.length === 0) {
      return;
    }

    const firestore = db;
    const unsubscribes = households.map((membership) =>
      onSnapshot(
        doc(firestore, "households", membership.householdId),
        (snapshot) => {
          if (!snapshot.exists()) return;
          const nextHousehold = {
            id: snapshot.id,
            ...snapshot.data(),
          } as Household;
          setHouseholdNames((current) => ({
            ...current,
            [snapshot.id]: nextHousehold.name,
          }));
        },
        () => setError("Een huishoudnaam kon niet worden geladen."),
      ),
    );

    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [currentUserLoaded, households]);

  const selectHousehold = useCallback((householdId: string) => {
    localStorage.setItem(selectedKey, householdId);
    localStorage.removeItem(legacySelectedKey);
    setSelectedId(householdId);
  }, []);

  const retryLoading = useCallback(() => {
    setError(undefined);
    setLoadedForUser(undefined);
    setLoadAttempt((attempt) => attempt + 1);
  }, []);

  const createNewHousehold = useCallback(
    async (name: string) => {
      if (!user) throw new Error("Log eerst in.");
      const id = await createHousehold(user, name);
      selectHousehold(id);
    },
    [selectHousehold, user],
  );

  const member = households.find(
    (membership) => membership.householdId === selectedId,
  );
  const activeMember = currentUserLoaded ? member : undefined;
  const activeHousehold =
    activeMember && household?.id === selectedId ? household : undefined;
  const loading = Boolean(
    user && (!currentUserLoaded || (activeMember && !activeHousehold)),
  );
  const value = useMemo<HouseholdContextValue>(
    () => ({
      households: currentUserLoaded ? households : [],
      householdNames,
      household: activeHousehold,
      member: activeMember,
      loading,
      error,
      retryLoading,
      selectHousehold,
      createNewHousehold,
    }),
    [
      createNewHousehold,
      error,
      householdNames,
      households,
      loading,
      activeHousehold,
      activeMember,
      currentUserLoaded,
      retryLoading,
      selectHousehold,
    ],
  );

  return (
    <HouseholdContext.Provider value={value}>
      {children}
    </HouseholdContext.Provider>
  );
}

export function useHousehold(): HouseholdContextValue {
  const context = useContext(HouseholdContext);
  if (!context)
    throw new Error("useHousehold moet binnen HouseholdProvider staan.");
  return context;
}
