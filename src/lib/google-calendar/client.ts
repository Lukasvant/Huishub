"use client";

import {
  GoogleAuthProvider,
  linkWithPopup,
  reauthenticateWithPopup,
  type User,
} from "firebase/auth";
import type { BusyBlock } from "@/lib/agenda/date-poll-planner";

export const GOOGLE_CALENDAR_FREEBUSY_SCOPE =
  "https://www.googleapis.com/auth/calendar.events.freebusy";

function googleCalendarProvider() {
  const provider = new GoogleAuthProvider();
  provider.addScope(GOOGLE_CALENDAR_FREEBUSY_SCOPE);
  provider.setCustomParameters({ prompt: "consent" });
  return provider;
}

function hasGoogleProvider(user: User) {
  return user.providerData.some(
    (provider) => provider.providerId === "google.com",
  );
}

export async function requestGoogleCalendarAccess(user: User): Promise<{
  accessToken: string;
  scopes: string[];
}> {
  const provider = googleCalendarProvider();
  const result = hasGoogleProvider(user)
    ? await reauthenticateWithPopup(user, provider)
    : await linkWithPopup(user, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (!credential?.accessToken) {
    throw new Error("Google gaf geen Calendar access token terug.");
  }
  return {
    accessToken: credential.accessToken,
    scopes: [GOOGLE_CALENDAR_FREEBUSY_SCOPE],
  };
}

export async function queryGoogleFreeBusy({
  accessToken,
  timeMin,
  timeMax,
  calendarId = "primary",
}: {
  accessToken: string;
  timeMin: Date;
  timeMax: Date;
  calendarId?: string;
}): Promise<BusyBlock[]> {
  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/freeBusy",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        items: [{ id: calendarId }],
      }),
    },
  );

  if (!response.ok) {
    throw new Error("Google Agenda kon vrije momenten niet ophalen.");
  }

  const payload = (await response.json()) as {
    calendars?: Record<
      string,
      { busy?: Array<{ start: string; end: string }> }
    >;
  };

  return (payload.calendars?.[calendarId]?.busy ?? []).map((block) => ({
    start: new Date(block.start),
    end: new Date(block.end),
  }));
}
