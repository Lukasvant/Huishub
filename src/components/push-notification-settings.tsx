"use client";

import { Bell, BellOff } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Card, Message } from "@/components/ui";
import {
  disablePushNotifications,
  enablePushNotifications,
  pushNotificationsEnabledOnDevice,
  supportsPushNotifications,
} from "@/lib/firebase/messaging";

export function PushNotificationSettings({ userId }: { userId: string }) {
  const [supported, setSupported] = useState<boolean>();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    void supportsPushNotifications().then((value) => {
      setSupported(value);
      setEnabled(value && pushNotificationsEnabledOnDevice());
    });
  }, []);

  async function enable() {
    setBusy(true);
    setMessage(undefined);
    try {
      await enablePushNotifications(userId);
      setEnabled(true);
      setMessage("Pushmeldingen staan aan op dit apparaat.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Aanzetten is niet gelukt.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMessage(undefined);
    try {
      await disablePushNotifications(userId);
      setEnabled(false);
      setMessage("Pushmeldingen staan uit op dit apparaat.");
    } catch {
      setMessage("Uitzetten is niet gelukt.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold">Pushmeldingen</h2>
          <p className="mt-1 text-sm text-muted">
            Ontvang een melding wanneer iemand daar bij een nieuwe boodschap
            bewust voor kiest.
          </p>
        </div>
        {enabled ? (
          <Bell className="h-5 w-5 text-sage-600" />
        ) : (
          <BellOff className="h-5 w-5 text-muted" />
        )}
      </div>
      {supported === false && (
        <div className="mt-3">
          <Message tone="info">
            Deze browser ondersteunt geen webpush. Op iPhone werkt dit vanuit
            TaskHive op het beginscherm.
          </Message>
        </div>
      )}
      {supported && (
        <Button
          className="mt-4"
          disabled={busy}
          variant={enabled ? "secondary" : "primary"}
          onClick={() => void (enabled ? disable() : enable())}
        >
          {enabled ? (
            <BellOff className="h-4 w-4" />
          ) : (
            <Bell className="h-4 w-4" />
          )}
          {busy
            ? "Even wachten..."
            : enabled
              ? "Meldingen uitzetten"
              : "Meldingen aanzetten"}
        </Button>
      )}
      {message && (
        <div className="mt-3">
          <Message
            tone={
              message.includes("niet") || message.includes("Geef")
                ? "error"
                : "success"
            }
          >
            {message}
          </Message>
        </div>
      )}
    </Card>
  );
}
