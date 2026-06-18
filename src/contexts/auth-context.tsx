"use client";

import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { auth, isFirebaseConfigured } from "@/lib/firebase/client";
import { saveUserProfile } from "@/lib/firebase/households";
import { disablePushNotifications } from "@/lib/firebase/messaging";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  configured: boolean;
  error?: string;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getAuthInstance() {
  if (!auth) throw new Error("Vul eerst de Firebase-instellingen in.");
  return auth;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setLoading(false);
      if (nextUser) {
        try {
          await saveUserProfile(nextUser);
        } catch {
          setError("Je profiel kon niet worden bijgewerkt.");
        }
      }
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      configured: isFirebaseConfigured,
      error,
      clearError: () => setError(undefined),
      login: async (email, password) => {
        setError(undefined);
        try {
          await signInWithEmailAndPassword(getAuthInstance(), email, password);
        } catch {
          setError("Inloggen is niet gelukt. Controleer je gegevens.");
          throw new Error("Inloggen mislukt");
        }
      },
      register: async (name, email, password) => {
        setError(undefined);
        try {
          const credential = await createUserWithEmailAndPassword(
            getAuthInstance(),
            email,
            password,
          );
          await updateProfile(credential.user, { displayName: name.trim() });
          await saveUserProfile(credential.user);
          await credential.user.reload();
          setUser(getAuthInstance().currentUser);
        } catch {
          setError(
            "Account aanmaken is niet gelukt. Gebruik een ander e-mailadres of sterker wachtwoord.",
          );
          throw new Error("Registratie mislukt");
        }
      },
      loginWithGoogle: async () => {
        setError(undefined);
        try {
          await signInWithPopup(getAuthInstance(), new GoogleAuthProvider());
        } catch {
          setError("Inloggen met Google is niet gelukt.");
          throw new Error("Google-inloggen mislukt");
        }
      },
      logout: async () => {
        const currentUser = getAuthInstance().currentUser;
        if (currentUser) {
          await disablePushNotifications(currentUser.uid).catch(
            () => undefined,
          );
        }
        await signOut(getAuthInstance());
      },
    }),
    [error, loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth moet binnen AuthProvider staan.");
  return context;
}
