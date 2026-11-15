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
  - Acceptans: Valet syns i URL:en (`#/Db/major`), och sidan öppnas med det valet när länken laddas. Bakåt/framåt i webbläsaren fungerar. Ogiltiga länkar faller tillbaka till C-dur. Vald flik, och vald tonart på kvintcirkeln, ska också gå att länka till.

## Senare

- [ ] **X-04** Välj enharmonisk stavning själv (C♯ eller D♭)
- [ ] **X-05** Svenskt gränssnitt och H/B-notation
- [ ] **X-06** Bättre pianovisning på mobil: etiketterna på svarta tangenter blir små vid 375 px bredd (större text eller bara den del av tangentbordet som behövs)
- [ ] **M4-01** Spela upp ackordet med Web Audio
- [ ] **M5-04** Klicka på ett diatoniskt ackord i kvintcirkelfliken för att öppna det i ackordfliken (förminskade ackord finns nu, M2-01)
- [ ] **X-08** Kom ihåg valet piano/gitarr (i URL:en tillsammans med X-01, eller i localStorage)
- [ ] **G-02** Andra stämningar (Drop D, DADGAD) och vänsterhänt hals
- [ ] **G-03** Fingersättning i greppen (vilket finger på vilken ton, barré markerad)
- [ ] **G-04** Fler varianter av samma grepp (t.ex. x13331 och x10331 för B♭), i dag visas bara det bästa i varje läge
- [ ] **G-05** Kvintackord (C5, powerchord) och andra grepp där de ljusa strängarna är dämpade. Greppsökningen kräver i dag att alla strängar från basen upp till sträng 1 spelas
- [ ] **M2-05** Fler ackord vid behov: 7♭13, 7♯5♯9, m(maj9), 13sus4, add4/add2 som egna namn, och snedackord (C/E)
- [ ] **M2-06** Ange vilka toner som utelämnas i greppen (t.ex. "utan kvint") i gitarrvyn

## Klart

- [x] **X-02** CI med GitHub Actions (`.github/workflows/ci.yml`) som kör `docker build` vid push till main och i pull requests _(2026-11-15)_
- [x] **X-03** ESLint och Prettier, körs i Docker-bygget före typkontrollen. Lint-verktygen ligger i `tools/lint/` med eget `package.json` eftersom typescript-eslint kräver TypeScripts JS-API (TS 6) medan appen typkontrolleras med TS 7. Hela koden är formatterad med Prettier _(2026-11-15)_
- [x] **M2-04** Omvändningar: grundläge samt 1:a, 2:a och 3:e omvändning (treklanger har två, fyrklanger och större tre). Pianot visar rätt läge och basen har en svart ram och förklaras i teckenförklaringen. Bara toner inom oktaven kan ligga i basen, så en nona eller tredecima blir kvar där den är. Väljaren visas bara för piano, och valet kläms till vad ackordet har när man byter ackord _(2026-11-15)_
- [x] **M1-01** Projektskelett: Vite, React, TypeScript, Dockerfile och docker compose (app + dev) _(2026-11-15)_
- [x] **M1-02** Teorimodul: stavade toner, intervall, skalor, dur- och mollackord med tabelltest för alla 24 _(2026-11-15)_
- [x] **M1-03** UI för att välja grundton (12) och dur/moll, och visa ackordets toner med intervallnamn _(2026-11-15)_
- [x] **M1-04** Pianovisualisering i SVG (C4–B5) med grundton och ackordtoner markerade _(2026-11-15)_
- [x] **M1-05** Planeringsdokument (ROADMAP, BACKLOG, CLAUDE.md) och README _(2026-11-15)_
- [x] **X-07** Växla mellan piano och gitarrhals: standardstämning, band 0–12, alla ackordtoner markerade och rätt stavade, tabelltest för alla 24 ackord. Halsen scrollar i sidled på smala skärmar _(2026-11-15)_
- [x] **M3-01** Skalvy: välj Ackord eller Skala, dur och naturlig moll på pianot från grundton till grundton, med stegnummer och intervallnamn. Tabelltest för alla 24 skalor _(2026-11-15)_
- [x] **G-01** Gitarrhalsen visar fyra band i taget med pilar ←/→. Ackord visas som spelbara grepp i grundläge (CAGED-formerna hittas automatiskt: basen är grundtonen, alla ackordtoner klingar, högst fyra fingrar med barré som ett). Skalor visas som lägen med hela skalan inom fyra band. Vid byte av ackord behålls läget på halsen _(2026-11-15)_
- [x] **M5-01** Flikar i appen (Chords & scales / Circle of fifths) med tangentbordsnavigering _(2026-11-15)_
- [x] **M5-02** Teorimodul för tonarter: förtecken, kvintcirkelns positioner med enharmoniska stavningar, relativ-, parallell-, dominant- och subdominanttonart samt diatoniska treklanger med steg och funktion, tabelltestat för alla positioner _(2026-11-15)_
- [x] **M2-01** Förminskade och överstigande treklanger: B° = B–D–F, C+ = C–E–G♯ _(2026-11-15)_
- [x] **M2-02** Sus2 och sus4, med tonerna märkta Major second och Perfect fourth _(2026-11-15)_
- [x] **M2-03** Septimackord och större: 36 ackordtyper i sju grupper (treklanger, sext-, septim-, non-, undecim- och tredecimackord samt tillagda toner). Allt är data i `chords.ts` med tabelltest för alla 12 grundtoner. Grundtonen på en svart tangent stavas så att ackordet får färst förtecken (C♯°, G♭+, B♭7). Toner som får utelämnas (ofta kvinten) markeras, och gitarrgreppen får hoppa över dem. Pianot växer till tre oktaver när ackordet når förbi B5. Väljaren visar ackordsymbolen på vald grundton _(2026-11-15)_
- [x] **M5-03** Kvintcirkeln i SVG med tonartspanel: välj med klick eller piltangenter, välj stavning, hoppa till närliggande tonarter _(2026-11-15)_
