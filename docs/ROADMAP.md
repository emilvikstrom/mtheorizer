# Roadmap

Övergripande leveranser (milstolpar) för mtheorizer. Varje milstolpe bryts ner i små uppgifter i [BACKLOG.md](BACKLOG.md) när det är dags att börja på den. Arbetsflödet beskrivs i [CLAUDE.md](../CLAUDE.md).

Status: ✅ klar · 🚧 pågår · ⏳ planerad · 💡 idé

| ID | Milstolpe | Status |
|----|-----------|--------|
| M1 | Ackorduppslag med pianovisning | ✅ |
| M2 | Fler ackordtyper och omvändningar | ✅ |
| M3 | Skalor och modi | 🚧 |
| M4 | Lyssna på ackord och skalor | 💡 |
| M5 | Tonarter och harmoniska samband | ✅ |
| X  | Tvärgående förbättringar (delbara länkar, språk, CI) | ⏳ |

## M1 – Ackorduppslag med pianovisning ✅

Mål: Appen startar med `docker compose up`, och man kan välja en av 12 grundtoner och dur eller moll. Appen visar ackordets toner, korrekt stavade, och markerar dem på ett pianotangentbord.

Resultat:
- En teorimodul där toner alltid är *stavade* (bokstav + förtecken), så att E♭-dur blir E♭–G–B♭ och aldrig D♯–G–A♯.
- För svarta tangenter väljs automatiskt den stavning vars tonart har färst förtecken: D♭-dur men C♯-moll.
- Pianot visar två oktaver (C4–B5) med ackordet i grundläge.

## M2 – Fler ackordtyper och omvändningar ✅

Mål: Alla vanliga treklanger och fyrklanger, och möjlighet att se ackordet i omvändning.
- Förminskade och överstigande treklanger, sus2 och sus4.
- Septimackord: maj7, 7, m7, m7♭5 och dim7.
- Omvändningar (första, andra och tredje) på pianot.

Resultat (M2-01–M2-04):
- 36 ackordtyper i sju grupper: treklanger (dur, moll, °, +, sus2, sus4), sextackord (6, m6, 6/9, m6/9), septimackord (maj7, 7, m7, m(maj7), m7♭5, °7, 7♯5, maj7♯5, 7♭5, 7sus4), nonackord (maj9, 9, m9, 7♭9, 7♯9, 9sus4), undecimackord (11, m11, 7♯11, maj7♯11), tredecimackord (13, maj13, m13) och tillagda toner (add9, m(add9), add11).
- Varje ton har en roll (grundton, sekund, ters … tredecima) och kan märkas som valfri. Gitarrgreppen får då utelämna den, som kvinten i öppet C7 (x32310).
- Omvändningar på pianot: grundläge samt 1:a–3:e omvändning, med basen markerad.

## M3 – Skalor och modi 🚧

Mål: Slå upp en skala eller modus på valfri grundton och se den på pianot.
- Dur, naturlig, harmonisk och melodisk moll.
- Kyrkotonarterna (jonisk till lokrisk).
- Pentatonik och blues.
- Klart: dur och naturlig moll, med en växel mellan ackord och skala (M3-01).

## M4 – Lyssna 💡

Mål: Spela upp ackord och skalor i webbläsaren (Web Audio), både som brutet ackord och som samklang.

## M5 – Tonarter och harmoniska samband ✅

Mål: Förstå hur ackord hänger ihop.
- Kvintcirkel.
- Diatoniska ackord i en tonart med stegnummer (I–ii–iii…) och funktion.
- Parallell- och relativtonart.

Resultat:
- Appen har flikar: **Chords & scales** (ackord- och skaluppslaget från M1 och M3) och **Circle of fifths**.
- Kvintcirkeln visar durtonarter ytterst, relativa molltonarter innerst och antal förtecken utanför. Positionerna med två namn (B/C♭, F♯/G♭, D♭/C♯) visar båda, och man kan välja stavning.
- Vald tonart visar förtecken, skala, de sju diatoniska treklangerna med steg och funktion (T/S/D), dominanten i harmonisk moll samt relativ-, parallell-, dominant- och subdominanttonart.
- `src/theory/keys.ts` härleder allt ur stavade toner, med tabelltester för alla positioner på cirkeln.

## X – Tvärgående förbättringar ⏳

- Delbara länkar som sparar valet i URL:en (`#/Db/major`).
- Svenskt gränssnitt och valbar H/B-notation (svensk tradition: H = B, B = B♭).
- Låta användaren välja enharmonisk stavning själv (C♯-dur i stället för D♭-dur).
- CI: GitHub Actions som kör Docker-bygget (typkontroll och tester).
- Lint och formattering (ESLint och Prettier).
- ✅ Visning på gitarrhals som alternativ till pianot (X-07), fyra band i taget med spelbara ackordgrepp och skallägen (G-01). Fler stämningar och fingersättning ligger i backloggen (G-02–G-04).
