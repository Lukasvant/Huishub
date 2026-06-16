# Google Agenda en datum prikken

Dit ontwerp beschrijft hoe TaskHive Google Agenda kan gebruiken om samen met vrienden of vriendengroepen een datum te prikken.

## Doel

Lukas moet vanuit de TaskHive-agenda een voorstel kunnen maken, bijvoorbeeld "eten met vrienden", waarna TaskHive naar zijn Google Agenda kijkt, geschikte momenten voorstelt en een publieke link maakt die vrienden kunnen openen zonder account.

Vrienden mogen nooit agenda-inhoud zien. Ze zien alleen voorgestelde tijdvakken en stemmen met hun naam.

## Niet doen

- Geen volledige tweerichtingssynchronisatie van Google Agenda in V1. Dat maakt foutkansen en privacyrisico's groter.
- Geen eventtitels, locaties of beschrijvingen uit Google Agenda opslaan.
- Geen vrienden verplicht laten inloggen.
- Geen publieke link toegang geven tot huishouddata.

## Aanbevolen productflow

1. Lukas klikt in Agenda op **Datum prikken**.
2. Als Google Agenda nog niet gekoppeld is, vraagt TaskHive om Google-toegang.
3. Lukas kiest:
   - titel
   - periode, bijvoorbeeld komende 4 weken
   - duur, bijvoorbeeld 2 uur
   - voorkeuren, bijvoorbeeld avond/weekend
   - optionele locatie of notitie
4. TaskHive haalt alleen vrije/bezet-blokken op uit Google Agenda.
5. TaskHive stelt geschikte tijdvakken voor.
6. Lukas kiest 3 tot 8 opties.
7. TaskHive maakt een deelbare link, bijvoorbeeld `/prikken/abc123`.
8. Vrienden vullen hun naam in en kiezen per tijdvak `kan`, `misschien` of `kan niet`.
9. Lukas ziet de score per tijdvak.
10. Lukas kiest de definitieve datum.
11. TaskHive maakt een lokale agenda-afspraak en, als Google gekoppeld is, ook een Google Calendar-event.

## Beste technische route

### Fase 1: veilige MVP op het huidige Spark-model

Deze variant kan zonder eigen server en zonder refresh tokens.

- Gebruik Firebase Auth Google-login met extra Calendar-scopes wanneer Lukas expliciet Google Agenda koppelt.
- Gebruik de Google access token alleen in de browser en alleen tijdens de sessie.
- Roep Google Calendar Freebusy aan om bezette blokken te bepalen.
- Maak de datumprikker en stemmen in Firestore.
- Maak de uiteindelijke Google-afspraak alleen als Lukas op dat moment opnieuw of nog steeds verbonden is.

Voordeel:

- Geen Blaze of Cloud Functions nodig.
- Geen refresh token opslag.
- Minder privacy- en securityrisico.
- Past bij V1/V1.5.

Nadeel:

- Google-koppeling is sessiegebonden.
- Geen automatische achtergrondsync.
- Lukas moet soms opnieuw koppelen voordat hij beschikbaarheid zoekt of de finale afspraak in Google zet.

### Fase 2: robuuste productie-integratie

Deze variant vereist een backend, bijvoorbeeld Firebase Cloud Functions of Cloud Run. Dat betekent praktisch: Firebase Blaze.

- Gebruik een volledige OAuth authorization-code flow.
- Sla refresh tokens server-side op, nooit in de browser.
- Laat Cloud Functions de Freebusy-query en event-aanmaak doen.
- Vernieuw access tokens server-side.
- Voeg eventueel Google Calendar push/webhook-sync toe.

Voordeel:

- Betrouwbaar, ook na dagen/weken.
- Finaliseren kan zonder opnieuw koppelen.
- Later geschikt voor partneragenda's en meerdere kalenders.

Nadeel:

- Meer setup.
- Waarschijnlijk Blaze nodig.
- OAuth consent en Google-verificatie kunnen meer werk worden als de app breder publiek wordt.

## Google Calendar API

Minimale scopes:

- `https://www.googleapis.com/auth/calendar.events.freebusy`
  - Alleen vrije/bezet-informatie ophalen.
- Later pas, bij definitief plannen:
  - `https://www.googleapis.com/auth/calendar.events.owned`
  - Event aanmaken/wijzigen op kalenders die de gebruiker bezit.

Belangrijk: vraag de schrijf-scope pas bij finaliseren. De eerste koppeling kan daardoor rustiger en privacyvriendelijker blijven.

Nuttige endpoints:

- `POST https://www.googleapis.com/calendar/v3/freeBusy`
- `POST https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events`

## Firestore-model

```text
households/{householdId}/calendarConnections/{userId}
  provider: "google"
  status: "connected" | "needs_reconnect"
  calendarId: "primary"
  scopes: string[]
  connectedAt
  updatedAt

households/{householdId}/datePolls/{pollId}
  title
  description?
  location?
  createdBy
  status: "draft" | "open" | "closed" | "scheduled"
  publicId
  durationMinutes
  timeZone: "Europe/Amsterdam"
  rangeStart
  rangeEnd
  candidateSlots: Array<{
    id
    startDateTime
    endDateTime
  }>
  selectedSlotId?
  selectedAgendaItemId?
  createdAt
  updatedAt

households/{householdId}/datePolls/{pollId}/responses/{responseId}
  name
  email?
  choices: Record<slotId, "yes" | "maybe" | "no">
  createdAt
  updatedAt
```

Voor publieke links is een aparte publieke collectie veiliger:

```text
publicDatePolls/{publicId}
  householdId
  pollId
  title
  description?
  location?
  status
  candidateSlots
  expiresAt

publicDatePolls/{publicId}/responses/{responseId}
  name
  email?
  choices
  createdAt
```

De publieke collectie bevat alleen wat vrienden mogen zien. Geen agenda-inhoud, geen huishoudleden, geen privé-items.

## Security rules

Voor publieke polls:

- Iedereen mag een actieve poll lezen op basis van `publicId`.
- Iedereen mag een response maken met beperkte velden.
- Niemand mag responses wijzigen of verwijderen behalve admins/partners via de huishoudroute.
- Publieke poll moet kunnen verlopen met `expiresAt`.

Voor Google-koppelingen:

- Calendar connection metadata mag alleen door het eigen lid gelezen worden.
- Tokens worden in fase 1 niet opgeslagen.
- In fase 2 worden tokens alleen server-side opgeslagen en niet client-readable gemaakt.

## Beschikbaarheidslogica

Input:

- datumrange
- duur
- toegestane dagen
- toegestane uren
- bezette blokken uit Google Freebusy
- lokale TaskHive-agenda-items

Output:

- tijdvakken die niet overlappen met bezette blokken
- gesorteerd op voorkeur, bijvoorbeeld eerst avonden/weekenden

V1-regel:

- Maak tijdvakken in stappen van 30 minuten.
- Filter overlap hard weg.
- Toon maximaal 12 suggesties.
- Lukas kiest zelf welke opties gedeeld worden.

## UX-tekst

Koppelen:

> TaskHive kijkt alleen wanneer je bezet bent. Vrienden zien nooit wat er in je agenda staat.

Delen:

> Deel deze link in WhatsApp. Iedereen kan zonder account aangeven welke momenten passen.

Finaliseren:

> Deze datum wordt toegevoegd aan TaskHive en aan je Google Agenda.

## Aanbeveling

Begin met fase 1.

Dat past bij de huidige PWA, houdt de privacy netjes en voorkomt dat we nu al Firebase Blaze, Cloud Functions en refresh-tokenopslag nodig hebben. Als het prikken in de praktijk goed voelt, bouwen we fase 2 erachter voor betrouwbaarheid en automatische herverbinding.
