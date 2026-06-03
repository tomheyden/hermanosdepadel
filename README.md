# Hermanos de Padel — Turnier-Web-App

Web-App für ein Padel-Turnier: ein öffentlicher OnePager mit allen Turnierinfos und
ein passwortgeschütztes Live-Dashboard zum Eintragen der Ergebnisse mit
Live-Berechnung von Tabellen, Qualifikation und KO-Baum.

**Stack:** Vite + React + TypeScript + Tailwind CSS + React Router.

---

## Schnellstart

```bash
npm install
npm run dev      # Dev-Server auf http://localhost:5173
```

Weitere Befehle:

```bash
npm run build    # Produktions-Build (inkl. TypeScript-Check)
npm run preview  # Build lokal ansehen
npm test         # Tests (Ranking- & Schedule-Logik)
```

## Routen & Navigation

Drei Bereiche, überall per Navigationsleiste erreichbar (Start · Turnier · Admin):

| Pfad        | Bereich   | Beschreibung                                              |
| ----------- | --------- | --------------------------------------------------------- |
| `/`         | Start     | Öffentlicher OnePager (Landing + Turnierinfos)            |
| `/turnier`  | Turnier   | Live-Turnier-Ansicht (Tabellen, KO-Baum, Endstand) — **kein** Passwort, ideal für Beamer/Zuschauer |
| `/admin`    | Admin     | Geschützte Eingabe der Ergebnisse (**Passwort**)          |

Alte Links werden automatisch weitergeleitet: `/live → /admin`, `/live/view → /turnier`.

---

## Was wo ändern?

### Logo

Datei `public/logo.svg` austauschen. Sie wird im Hero, Footer und als Favicon
verwendet. Format/Größe sind frei (das SVG skaliert).

### Bilder (Hero & Location)

Die Foto-Hintergründe liegen in `public/`:

| Datei                       | Verwendung                                   |
| --------------------------- | -------------------------------------------- |
| `players-golden-hour.jpg`   | Hero-Hintergrund (mit grünem Gradient-Overlay) |
| `court-aerial.jpg`          | Location-Band „Donauinsel"                   |

Zum Tauschen einfach die Datei ersetzen (gleicher Name) oder den `src` in
`components/onepager/Hero.tsx` bzw. `LocationSection.tsx` anpassen. Tipp: große
Fotos vor dem Deploy als WebP komprimieren (z.B. < 300 KB) für schnellere Ladezeit.

### Akzentfarbe & Markenfarben

Alle Farben sind zentrale Design-Tokens in **`tailwind.config.js`** → `theme.extend.colors`:

| Token         | Bedeutung                                  | Default     |
| ------------- | ------------------------------------------ | ----------- |
| `accent`      | Der eine kräftige Akzent (Buttons, Pops)   | `#C6F141`   |
| `accent.ink`  | Lesbare Textfarbe **auf** dem Akzent       | `#1A2400`   |
| `ink`         | Haupttext / dunkle Flächen                 | `#0E140C`   |
| `paper`       | Seitenhintergrund                          | `#F7F5EF`   |
| `court`       | Dunkelgrüne Premium-Sektionen (Brand-Grün) | `#002c1e`   |
| `muted`       | Gedämpfter Fließtext (≥ 4.5:1 auf `paper`) | `#5B6356`   |

Eine Farbe hier ändern → schlägt überall durch.

### Schriften

Display- und Body-Font sind in `index.html` (Google-Fonts-Link) und
`tailwind.config.js` (`fontFamily`) definiert: **Barlow Condensed** (Display) +
**Barlow** (Body). Zum Tauschen beide Stellen anpassen.

### Passwort (Admin-Bereich)

Das Passwort kommt aus der Umgebungsvariable **`VITE_ADMIN_PASSWORD`**:

- **Lokal:** in `.env.local` setzen (Vorlage: `.env.example`). Diese Datei wird
  nicht eingecheckt.
- **Vercel:** unter _Settings → Environment Variables_ `VITE_ADMIN_PASSWORD`
  anlegen (für Production/Preview), danach **neu deployen** — der Wert wird beim
  Build eingebacken.
- Fällt die Variable weg, greift der Default `padel2026` (`src/lib/auth.ts`).

> ⚠️ **Kein echter Schutz.** Die App ist ein statischer Vite-Build; `VITE_`-Werte
> landen im ausgelieferten JavaScript und sind im Browser sichtbar. Der Gate
> hält den Admin-Bereich nur vor versehentlichem Zugriff fern. Die
> Turnier-Ansicht `/turnier` ist bewusst **ohne** Passwort.

### Deployment auf Vercel

- Framework wird als **Vite** erkannt. Build: `npm run build`, Output: `dist`.
- `vercel.json` enthält ein SPA-Rewrite (`/(.*) → /index.html`), damit
  Deep-Links wie `/admin` oder `/turnier` auch bei direktem Aufruf/Reload laden.
- Env-Variable `VITE_ADMIN_PASSWORD` setzen (siehe oben) und deployen.

---

## Architektur

```
src/
  types/index.ts        Domain-Typen (Scenario, Group, Match, Team, Standing …)
  data/scenarios.ts     Die 6 Turnier-Szenarien (typisierte Datenstruktur)
  lib/
    storage.ts          Storage-Abstraktion (s. u.) — kein direkter localStorage-Zugriff
    schedule.ts         Spielplan-Generator (Round-Robin / Zeitslots), getestet
    match.ts            Match-Auswertung (Punkte / Sätze / Match-Tie-Break)
    standings.ts        Gruppen-Ranking (Americano): Siege → Diff → Punkte
    qualification.ts    Automatische Qualifikation + Über-Kreuz-Setzung
    bracket.ts          KO-Baum: Sieger rücken auf, Endstand 1–4
    auth.ts             Passwort-Gate fürs Dashboard
    display.ts          Anzeige-Helfer (Namen, Format-Labels)
  hooks/                React-Hooks (Scroll-Reveal, Tournament-State)
  components/onepager/  OnePager-Sektionen
  components/live/       Dashboard-UI (Setup, Spielplan, Tabellen, Bracket, Endstand)
  pages/                OnePager, Live (Dashboard), LiveView (Beamer)
```

### Ranking- & Qualifikationslogik (der heikle Teil)

Reine, getestete Funktionen (`npm test`):

- **Gruppen-Ranking** (`standings.ts`): 1. gewonnene Spiele, 2. Gesamt-Punktedifferenz,
  3. erzielte Gesamtpunkte, 4. stabiler Fallback. Gruppenspiele sind
  Americano-Einzelspiele — eingetragen werden die **erzielten Punkte** (z.B. 21:14).
- **Qualifikation** (`qualification.ts`): Top N je Gruppe (+ optional beste
  Zweite/Dritte). Setzung „über Kreuz": Gruppensieger sind gesetzt-geschützt und
  treffen in der ersten KO-Runde auf einen Zweiten/Dritten einer **anderen**
  Gruppe (Best-effort-Vermeidung gruppeninterner Duelle).
- **KO-Baum** (`bracket.ts`): löst Setzplätze und „Sieger/Verlierer von Spiel X"
  auf, lässt Sieger automatisch aufrücken, berechnet den Endstand 1–4.

Die generierten Spielpläne sind gegen die **exakt vorgegebenen Referenzpläne von
Szenario 1 und Szenario 6** getestet (`schedule.test.ts`).

### Datenhaltung & späterer DB-Wechsel

Komponenten greifen **nie** direkt auf `localStorage` zu, sondern auf die
`storage`-Abstraktion in **`src/lib/storage.ts`**. Diese implementiert ein
`Storage`-Interface mit `load` / `save` / `clear` / `subscribe` — alle Methoden
sind bereits `Promise`-basiert.

Für einen Wechsel auf **Supabase/Firebase** genügt es, eine neue Klasse zu
schreiben, die dasselbe Interface erfüllt, und die exportierte `storage`-Instanz
am Dateiende auszutauschen. Kein weiterer Code muss angefasst werden.

### Neues Szenario hinzufügen

Szenarien stecken in `src/data/scenarios.ts` als `SCENARIO_SPECS`-Array. Ein
neuer Eintrag definiert nur die Eckdaten — Gruppen-Spielplan und KO-Baum werden
daraus **generiert**:

```ts
{
  id: 7,
  name: '8 Teams · Top 4',
  description: '…',
  groupSizes: [4, 4],          // Gruppengrößen
  groupDuration: 12,           // Minuten pro Gruppenspiel
  qualification: { topPerGroup: 2, qualifierCount: 4 },
  endTime: '15:30',
  koSummary: '…',
  buildKo: (groupEnd) => buildKo4(addMinutes(groupEnd, 3), BO3_TO_6, '14:30', BO3_TO_6),
}
```

Der Generator (`buildGroupSchedule`) ist gegen den exakt vorgegebenen
Spielplan von Szenario 1 getestet (`src/lib/schedule.test.ts`), die übrigen
Szenarien werden „analog" erzeugt.

---

## Animation & Accessibility

- Signature-Scroll-Animation: ein Padel-Ball, der beim Scrollen mit Trail durchs
  Bild springt (`components/onepager/ScrollBall.tsx`), plus gestaffelte
  Section-Reveals (`hooks/useReveal.ts`).
- `prefers-reduced-motion` wird respektiert: Ball wird nicht gerendert, Reveals
  erscheinen sofort ohne Transition, Smooth-Scroll ist aus.

---

## Status

- [x] Schritt 1 — Setup, Datenstrukturen, Storage-Abstraktion
- [x] Schritt 2 — Öffentlicher OnePager (Eckdaten + Americano-Grafik + Ablauf)
- [x] Schritt 3 — Live-Dashboard (Setup → Spielplan → Tabellen → Bracket → Endstand)
- [x] Optional — Read-only Beamer-Ansicht (`/live/view`), auto-aktualisierend
```
