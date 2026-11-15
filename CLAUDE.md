# mtheorizer – arbetsanvisningar

En webapp för att slå upp musikteori. Den är byggd med TypeScript, React och Vite. Testerna körs med Vitest, och produktionsbygget serveras av nginx via docker compose.

## Kommandon

Node finns inte på värddatorn, så allt körs i Docker. Om `docker` inte hittas ligger det i `~/.docker/bin/docker` (Docker Desktop).

| Vad | Kommando |
|-----|----------|
| Starta appen (http://localhost:8080) | `docker compose up --build -d` |
| Stoppa | `docker compose down` |
| Dev-server med hot reload (http://localhost:5173) | `docker compose --profile dev up dev` |
| Kör testerna | `docker compose run --rm dev npm test` |
| Typkontroll | `docker compose run --rm dev npm run typecheck` |
| Lägga till ett paket | `docker compose run --rm dev npm install <paket>` och sedan `docker compose build dev` |

Om `package.json` har ändrats och dev-servern körs med gamla `node_modules`: `docker compose --profile dev up dev --build --renew-anon-volumes`.

`docker compose build` kör typkontroll och alla tester. Om något fallerar byggs ingen image.

## Struktur

- `src/theory/` innehåller ren musikteori utan React. All logik hör hemma här och ska ha enhetstester.
  - `notes.ts`: stavade toner (`Note` = bokstav + förtecken), tonklass, formattering.
  - `intervals.ts`: intervall (bokstavssteg + halvtoner) och `transpose`.
  - `scales.ts`: skalor, antal förtecken i tonartens förtecken och stavning av grundton (`preferredTonicSpelling`, `scaleOnPitchClass`).
  - `chords.ts`: ackordkvaliteter, `buildChord` och `preferredRootSpelling`.
  - `voicing.ts`: placering på tangentbordet (MIDI-nummer). `chordOnKeyboard`/`scaleOnKeyboard` ger `KeyboardTone[]` som `Piano` visar.
  - `fretboard.ts`: gitarrstämning och var tonerna ligger på halsen (sträng + band). `positionsOnNeck` fungerar för både ackord och skalor.
  - `guitarShapes.ts`: utsnitt av halsen på fyra band. `chordShapes` söker spelbara grepp i grundläge, `scalePositions` ger skallägen.
  - `keys.ts`: tonarter, förtecken, kvintcirkeln, närliggande tonarter och diatoniska treklanger.
- `src/components/` innehåller React-komponenter som bara presenterar det teorimodulen räknar fram.
- `docs/` innehåller planeringen (se nedan).

## Konventioner

- **Stava alltid toner.** Representera aldrig en ton som bara en tonklass (0–11) när den ska visas. Gå via `Note` och `transpose` så blir stavningen rätt (E♭–G–B♭, inte D♯–G–A♯).
- Nya ackord, skalor och intervall läggs till som data i teorimodulen, tillsammans med tabelltester som täcker alla 12 grundtoner.
- Kod, kommentarer och gränssnittstext skrivs på engelska. Planeringsdokumenten skrivs på svenska.
- Bas-images i `Dockerfile` är pinnade till exakta versioner. Uppdatera dem medvetet.

## Planering: så arbetar vi

Planeringen ligger i två filer:

- [`docs/ROADMAP.md`](docs/ROADMAP.md) beskriver milstolparna (M1, M2 …), vad var och en ska uppnå och vilken status den har.
- [`docs/BACKLOG.md`](docs/BACKLOG.md) innehåller små uppgifter med ID och acceptanskriterier, under rubrikerna **Pågår / Nästa / Senare / Klart**.

Arbetsflöde för varje uppgift:

1. Ta den översta uppgiften under **Nästa**, om inget annat sägs, och flytta den till **Pågår**.
2. Om den är större än ungefär en session, bryt ner den i flera uppgifter i backloggen först.
3. Implementera med tester. Kör `docker compose build` så att typkontroll och tester går igenom.
4. Bocka av uppgiften, flytta den till **Klart** med datum och uppdatera milstolpens status i ROADMAP om det behövs.
5. Nya idéer och upptäckter läggs under **Senare**, eller som en ny milstolpe i ROADMAP, i stället för att byggas direkt.

När en milstolpe ska påbörjas bryts den först ner i uppgifter under **Nästa**.
