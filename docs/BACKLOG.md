# Backlog

Små, avgränsade uppgifter. Varje uppgift ska rymmas i ungefär en arbetssession och ge något som går att testa. Större saker bryts ner först. Övergripande mål finns i [ROADMAP.md](ROADMAP.md) och arbetsflödet i [CLAUDE.md](../CLAUDE.md).

Format:

```
- [ ] **ID** Titel
  - Acceptans: vad som ska vara sant när uppgiften är klar
```

ID:t består av milstolpe och löpnummer, till exempel `M2-03` eller `X-01`. Ordningen under **Nästa** är prioritetsordningen.

## Pågår

_Inget just nu._

## Nästa

- [ ] **X-01** Delbar länk till valt ackord
  - Acceptans: Valet syns i URL:en (`#/Db/major`), och sidan öppnas med det valet när länken laddas. Bakåt/framåt i webbläsaren fungerar. Ogiltiga länkar faller tillbaka till C-dur.
- [ ] **M2-01** Förminskade och överstigande treklanger
  - Acceptans: Kvalitetsväljaren har Diminished och Augmented. Stavningen är korrekt, till exempel B° = B–D–F och C+ = C–E–G♯, och alla 12 grundtoner × 2 nya kvaliteter är tabelltestade.
- [ ] **M2-02** Sus2 och sus4
  - Acceptans: Csus2 = C–D–G och Csus4 = C–F–G, med tabelltest för alla grundtoner. Rollnamnen i UI:t blir rätt (Second/Fourth i stället för Third).
- [ ] **M2-03** Septimackord (maj7, 7, m7, m7♭5, dim7)
  - Acceptans: Fyra toner visas och markeras, och stavningen följer reglerna (B♭7 = B♭–D–F–A♭). Ackordet får plats på pianot eller så utökas tangentbordet.
- [ ] **M2-04** Omvändningar
  - Acceptans: Man kan välja grundläge eller 1:a, 2:a (och 3:e) omvändning. Pianot visar rätt läge, och basen markeras.

## Senare

- [ ] **X-02** CI med GitHub Actions som kör `docker build`
- [ ] **X-03** ESLint och Prettier, körs i Docker-bygget
- [ ] **X-04** Välj enharmonisk stavning själv (C♯ eller D♭)
- [ ] **X-05** Svenskt gränssnitt och H/B-notation
- [ ] **X-06** Bättre pianovisning på mobil: etiketterna på svarta tangenter blir små vid 375 px bredd (större text eller bara den del av tangentbordet som behövs)
- [ ] **M3-01** Skalvy: dur och naturlig moll på pianot (bygger på `buildScale`)
- [ ] **M4-01** Spela upp ackordet med Web Audio
- [ ] **X-08** Kom ihåg valet piano/gitarr (i URL:en tillsammans med X-01, eller i localStorage)
- [ ] **G-01** Ackordgrepp på gitarrhalsen: visa ett spelbart grepp (t.ex. CAGED-formerna) i stället för alla positioner
- [ ] **G-02** Andra stämningar (Drop D, DADGAD) och vänsterhänt hals

## Klart

- [x] **M1-01** Projektskelett: Vite, React, TypeScript, Dockerfile och docker compose (app + dev) _(2026-11-15)_
- [x] **M1-02** Teorimodul: stavade toner, intervall, skalor, dur- och mollackord med tabelltest för alla 24 _(2026-11-15)_
- [x] **M1-03** UI för att välja grundton (12) och dur/moll, och visa ackordets toner med intervallnamn _(2026-11-15)_
- [x] **M1-04** Pianovisualisering i SVG (C4–B5) med grundton och ackordtoner markerade _(2026-11-15)_
- [x] **M1-05** Planeringsdokument (ROADMAP, BACKLOG, CLAUDE.md) och README _(2026-11-15)_
- [x] **X-07** Växla mellan piano och gitarrhals: standardstämning, band 0–12, alla ackordtoner markerade och rätt stavade, tabelltest för alla 24 ackord. Halsen scrollar i sidled på smala skärmar _(2026-11-15)_
