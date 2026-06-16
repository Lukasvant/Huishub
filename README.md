# TaskHive

TaskHive is een rustige Nederlandse web-app/PWA voor gedeelde huishoudplanning. V1 is gericht op een betrouwbaar dagelijks gebruik door twee bewerkers, met veilige alleen-lezen toegang voor oppas of familie.

## V1-functionaliteit

- Firebase Authentication met e-mail/wachtwoord en Google-login.
- Huishouden aanmaken en leden uitnodigen als `partner` of `viewer`.
- Dashboard met vandaag, komende agenda, open taken, boodschappen en in-appmeldingen.
- Taken met toewijzing, zichtbaarheid en herhaling: dagelijks, wekelijks, maandelijks, elke X periode, weekdagen en laatste vrijdag van de maand.
- Snelle gedeelde boodschappenlijst met gekocht-status, opruimen, snelle artikelen en Nederlandse spraakinput met bevestiging.
- Agenda met lijst/dag/week en privé-items.
- PWA-manifest en offline shell.

## Techniek

- Next.js App Router, TypeScript in strict mode en Tailwind CSS.
- Firebase Authentication en Cloud Firestore.
- Statische Next.js-export naar Firebase Hosting, geschikt voor het gratis Spark-plan.
- Vitest en Testing Library voor domein- en componenttests.

Supabase, native apps, chatintegraties en locatietriggers maken nadrukkelijk geen deel uit van V1.

## Lokale setup

1. Installeer dependencies:

   ```bash
   npm install
   ```

2. Maak een Firebase-project aan op het gratis **Spark**-plan. Activeer Authentication providers `Email/Password` en optioneel `Google`, en maak een Firestore-database aan.

3. Kopieer `.env.example` naar `.env.local` en vul de web-appconfiguratie uit Firebase in:

   ```dotenv
   NEXT_PUBLIC_FIREBASE_API_KEY=...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   NEXT_PUBLIC_FIREBASE_APP_ID=...
   ```

4. Log in bij de Firebase CLI. De aanwezige `.firebaserc` koppelt dit project al
   aan het bestaande Firebase-project `huishub-930f2`:

   ```bash
   npx firebase-tools login
   ```

5. Bouw de statische PWA en deploy backendregels plus hosting:

   ```bash
   npm run deploy
   ```

6. Start de app:

   ```bash
   npm run dev
   ```

   Open `http://localhost:3000`.

## Rollen en privacy

| Rol       | Taken, boodschappen en agenda bewerken | Leden beheren | Privé-agenda zien |
| --------- | -------------------------------------- | ------------- | ----------------- |
| `admin`   | Ja                                     | Ja            | Ja                |
| `partner` | Ja                                     | Nee           | Ja                |
| `viewer`  | Nee                                    | Nee           | Nee               |

Een admin maakt via **Instellingen > Leden** een uitnodiging op e-mailadres. Wanneer die persoon met hetzelfde Firebase Authentication-e-mailadres inlogt, accepteert de app de open uitnodiging en verschijnt het huishouden automatisch.

Frontendfilters zorgen voor een rustige UX, maar zijn niet de beveiliging: `firestore.rules` verbiedt viewerwrites en blokkeert het lezen van privé-afspraken.

## Firestore-model

```text
users/{userId}
households/{householdId}
  members/{userId}
  invites/{inviteId}
  tasks/{taskId}
  groceryItems/{groceryItemId}
  agendaItems/{agendaItemId}
  calendarConnections/{userId}
  datePolls/{datePollId}
    responses/{responseId}
  notifications/{notificationId}
publicDatePolls/{publicId}
  responses/{responseId}
publicDatePollOwners/{publicId}
```

De interfaces staan in `src/types/models.ts`. Documenten bevatten `createdAt` en `updatedAt` waar van toepassing. Agenda-items schrijven altijd `visibleToViewers = !private`; security rules controleren die invariant. Publieke datumprikker-documenten bevatten alleen deelbare velden; de interne eigenaar-koppeling staat apart in `publicDatePollOwners`.

De geplande Google Agenda-koppeling en publieke datumprikker staan uitgewerkt in `docs/google-calendar-date-polls.md`. De beschikbaarheidslogica leeft provider-onafhankelijk in `src/lib/agenda/date-poll-planner.ts`, zodat Google Freebusy later alleen bezette blokken hoeft aan te leveren.

## Spraak

`parseDutchGroceryInput()` staat los in `src/lib/groceries/parser.ts`. Browser Speech Recognition verzorgt de transcriptie wanneer beschikbaar; anders kan dezelfde bevestigingsflow handmatig worden gebruikt.

## Agenda-koppelingen

De datumprikker kan vrije opties maken met TaskHive-afspraken, Google Freebusy en Apple Kalender-exportbestanden. Apple/macOS Kalender wordt in V1 ondersteund via `.ics` import, omdat een web/PWA niet direct in de lokale macOS Kalender kan lezen zonder native app of server-side CalDAV-koppeling. Geimporteerde `.ics` afspraken worden alleen als bezette blokken gebruikt bij het maken van opties en worden niet stilzwijgend opgeslagen als TaskHive-afspraken.

## Hosting en kosten

V1 gebruikt geen Firebase Storage of App Hosting. De app exporteert statisch naar `out/` en kan daardoor met klassieke Firebase Hosting op het gratis Spark-plan draaien. Binnen Spark wordt Hosting bij overschrijding van de gratis quota beperkt in plaats van doorgerekend; er hoeft geen betaalaccount gekoppeld te worden.

## Kwaliteitscontrole

```bash
npm run lint
npm run test
npm run build
```

Tests dekken de Nederlandse parser, herhalingsberekening, rol/privacyhelpers en de belangrijkste componentflows voor boodschappen, taken en privé-agenda.

Firestore security rules hebben een aparte emulator-test:

```bash
npm run test:rules
```

Deze test start de Firestore Emulator en vereist lokaal Java. Zonder Java stopt de Firebase CLI met de melding dat `java -version` niet beschikbaar is.

## Roadmap na V1

- Foto-upload van de papieren agenda met Firebase Storage en OCR-review na menselijke bevestiging.
- Google Agenda-koppeling met Datumprikker-links voor vrienden en vriendengroepen.
- Browser pushmeldingen bovenop de huidige in-appmeldingen.
- WhatsApp/Signal verzenden, lezen en boodschappen toevoegen via berichten.
- Locatieherinneringen nabij winkels, bijvoorbeeld AH.
- Native Android- en iOS-apps.
- Diepere planningsassistent en Google/Apple Calendar-integraties.
