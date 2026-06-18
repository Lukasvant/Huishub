"use client";

import { deleteDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db, firebaseApp } from "@/lib/firebase/client";

const TOKEN_STORAGE_KEY = "taskhive-push-token-id";
const MESSAGING_SW = "/firebase-messaging-sw.js";
const MESSAGING_SCOPE = "/firebase-cloud-messaging-push-scope";

async function tokenId(token: string): Promise<string> {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function messagingRegistration(): Promise<ServiceWorkerRegistration> {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Deze browser ondersteunt geen pushmeldingen.");
  }
  return navigator.serviceWorker.register(MESSAGING_SW, {
    scope: MESSAGING_SCOPE,
  });
}

export async function supportsPushNotifications(): Promise<boolean> {
  if (
    typeof window === "undefined" ||
    !("Notification" in window) ||
    !firebaseApp
  ) {
    return false;
  }
  try {
    const { isSupported } = await import("firebase/messaging");
    return isSupported();
  } catch {
    return false;
  }
}

export async function enablePushNotifications(userId: string): Promise<void> {
  if (!firebaseApp || !db) throw new Error("Firebase is nog niet ingesteld.");
  if (!(await supportsPushNotifications())) {
    throw new Error("Pushmeldingen worden op dit apparaat niet ondersteund.");
  }
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    throw new Error("De pushsleutel is nog niet ingesteld voor TaskHive.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Geef TaskHive toestemming om meldingen te sturen.");
  }

  const registration = await messagingRegistration();
  const { getMessaging, getToken } = await import("firebase/messaging");
  const token = await getToken(getMessaging(firebaseApp), {
    vapidKey,
    serviceWorkerRegistration: registration,
  });
  if (!token) throw new Error("Dit apparaat kon niet worden aangemeld.");
  const id = await tokenId(token);
  await setDoc(doc(db, "users", userId, "pushTokens", id), {
    token,
    userId,
    userAgent: navigator.userAgent,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  localStorage.setItem(TOKEN_STORAGE_KEY, id);
}

export async function disablePushNotifications(userId: string): Promise<void> {
  if (!firebaseApp || !db) return;
  const id = localStorage.getItem(TOKEN_STORAGE_KEY);
  const { deleteToken, getMessaging } = await import("firebase/messaging");
  await deleteToken(getMessaging(firebaseApp)).catch(() => false);
  if (id) await deleteDoc(doc(db, "users", userId, "pushTokens", id));
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function pushNotificationsEnabledOnDevice(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "granted" &&
    Boolean(localStorage.getItem(TOKEN_STORAGE_KEY))
  );
}

export async function listenForForegroundMessages(
  onNotification: (title: string, body?: string) => void,
): Promise<() => void> {
  if (!firebaseApp || !(await supportsPushNotifications())) return () => {};
  const { getMessaging, onMessage } = await import("firebase/messaging");
  return onMessage(getMessaging(firebaseApp), (payload) => {
    onNotification(
      payload.notification?.title ?? "TaskHive",
      payload.notification?.body,
    );
  });
}
