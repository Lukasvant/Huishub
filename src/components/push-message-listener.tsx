"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { listenForForegroundMessages } from "@/lib/firebase/messaging";

export function PushMessageListener() {
  const { user } = useAuth();

  useEffect(() => {
    if (
      !user ||
      !("Notification" in window) ||
      Notification.permission !== "granted"
    )
      return;
    let unsubscribe = () => {};
    void listenForForegroundMessages((title, body) => {
      void navigator.serviceWorker.ready.then((registration) =>
        registration.showNotification(title, {
          body,
          icon: "/icons/icon.svg",
          data: { url: "/groceries" },
        }),
      );
    }).then((stop) => {
      unsubscribe = stop;
    });
    return () => unsubscribe();
  }, [user]);

  return null;
}
