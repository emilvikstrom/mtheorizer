# Roadmap

Övergripande leveranser (milstolpar) för mtheorizer. Varje milstolpe bryts ner i små uppgifter i [BACKLOG.md](BACKLOG.md) när det är dags att börja på den. Arbetsflödet beskrivs i [CLAUDE.md](../CLAUDE.md).

Status: ✅ klar · 🚧 pågår · ⏳ planerad · 💡 idé

| ID | Milstolpe | Status |
|----|-----------|--------|
| M1 | Ackorduppslag med pianovisning | ✅ |
| M2 | Fler ackordtyper och omvändningar | ✅ |
| M3 | Skalor och modi | ✅ |
| M4 | Lyssna på ackord och skalor | ✅ |
| M5 | Tonarter och harmoniska samband | ✅ |
| M6 | Ackordbyggare | ✅ |
| M7 | Utbyggd kvintcirkel (flera ringar) | ✅ |
| M8 | Harmoni och progressioner | 🚧 |
| M9 | Öva | 💡 |
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

Resultat (M2-01–M2-05):
- 43 ackordtyper i sju grupper: treklanger (dur, moll, °, +, sus2, sus4, 5), sextackord (6, m6, 6/9, m6/9), septimackord (maj7, 7, m7, m(maj7), m7♭5, °7, 7♯5, maj7♯5, 7♭5, 7sus4), nonackord (maj9, 9, m9, m(maj9), 7♭9, 7♯9, 7♯5♯9, 9sus4), undecimackord (11, m11, 7♯11, maj7♯11), tredecimackord (13, maj13, m13, 7♭13, 13sus4) och tillagda toner (add2, add4, add9, m(add9), add11).
- Varje ton har en roll (grundton, sekund, ters … tredecima) och kan märkas som valfri. Gitarrgreppen får då utelämna den, som kvinten i öppet C7 (x32310).
- Omvändningar på pianot: grundläge samt 1:a–3:e omvändning, med basen markerad och skriven som snedackord (C/E).

## M3 – Skalor och modi ✅

Mål: Slå upp en skala eller modus på valfri grundton och se den på pianot.
- Dur, naturlig, harmonisk och melodisk moll.
- Kyrkotonarterna (jonisk till lokrisk).
- Pentatonik och blues.

Resultat (M3-01–M3-03):
- 13 skalor som data i `src/theory/scales.ts`: dur (jonisk), naturlig, harmonisk och melodisk moll, dorisk, frygisk, lydisk, mixolydisk, lokrisk, dur- och mollpentatonik samt moll- och durblues (med bluetonen ♭5 respektive ♭3).
- Skalorna är fem, sex eller sju toner långa och stavas rätt på alla 12 grundtoner, med färst förtecken i grundtonen. Dubbla namn avgörs av en tabell per skala.
- Skalväljaren är grupperad (Major & minor, Modes, Pentatonic & blues). Skalorna visas på piano och gitarrhals, spelas upp och ligger i länken (`#/D/scale/dorian`). Byte tillbaka till ackord ger treklangen på skalan (D° för lokrisk).

## M4 – Lyssna ✅

Mål: Spela upp ackord och skalor i webbläsaren (Web Audio), både som brutet ackord och som samklang.

Resultat:
- `src/audio/playback.ts` planerar uppspelningen (ren funktion, testad) och spelar med Web Audio-oscillatorer. Ackord spelas i valt läge, antingen som samklang eller brutet nerifrån och upp; skalor spelas uppåt.
- Knapparna syns bara när webbläsaren har Web Audio.

## M5 – Tonarter och harmoniska samband ✅

Mål: Förstå hur ackord hänger ihop.
- Kvintcirkel.
- Diatoniska ackord i en tonart med stegnummer (I–ii–iii…) och funktion.
- Parallell- och relativtonart.

Resultat:
- Appen har flikar: **Chords & scales** (ackord- och skaluppslaget från M1 och M3) och **Circle of fifths**. Sedan UI-01 är ackord och skalor två flikar, **Chords** och **Scales**.
- Kvintcirkeln visar durtonarter ytterst, relativa molltonarter innerst och antal förtecken utanför. Positionerna med två namn (B/C♭, F♯/G♭, D♭/C♯) visar båda, och man kan välja stavning.
- Vald tonart visar förtecken, skala, de sju diatoniska treklangerna med steg och funktion (T/S/D), dominanten i harmonisk moll samt relativ-, parallell-, dominant- och subdominanttonart.
- `src/theory/keys.ts` härleder allt ur stavade toner, med tabelltester för alla positioner på cirkeln.

## M6 – Ackordbyggare ✅

Mål: Ackordväljaren ersätts av en byggare. Man väljer ett grundackord (C, Cm, C°, C+, Csus2, Csus4 eller C5) och lägger på kvaliteter, och appen namnger resultatet.

- Kvaliteterna är septima (7, maj7, °7), sext (6), utvidgningar (9, 11, 13), altererade toner (♭5, ♭9, ♯9, ♯11, ♭13) och tillagda toner (add2, add4, add9, add11).
- Bara de kvaliteter som passar ackordet som det ser ut nu visas. På Cm visas inte ♭5 (det blir C°), på C° visas °7 men inte maj7, på Csus4 visas inte 11, C5 har inga kvaliteter, och 9, 11 och 13 visas först när en septima är vald.
- Alla 43 nuvarande ackordtyper går att bygga (C+ med 7 blir C7♯5), och deras namn används när kombinationen har ett. Fria kombinationer som C7♭5♭9 går också.
- Den nuvarande grupperade ackordväljaren tas bort.
- Teorimodulen får en `ChordSpec`, regler för vilka kvaliteter som är tillgängliga och namngivning (symbol och namn), tabelltestat mot alla 43 typer. Tonerna stavas som förut via `transpose`.
- Ackord bygger vidare på samma piano, gitarr, ljud och omvändningar, och får delbara länkar.
- Därefter åt andra hållet: skriv in en ackordsymbol (`F#m7b5/C`) eller klicka in toner och se vilket ackord de bildar.

Uppgifter: M6-01–M6-08d är klara, senast pianots tangenter i länken till "What chord is this?" (M6-08d).

## M7 – Utbyggd kvintcirkel ✅

Mål: Kvintcirkeln visar inte bara tonarter utan hur ackorden i en tonart ligger i förhållande till varandra. Det är de varianterna med flera rader (ringar) som finns på tryckta ackordhjul och på nätet.

**Vad är det?** Den vanliga kvintcirkeln har två ringar: durtonarter ytterst och deras relativa molltonarter innanför. Den utbyggda har fler ringar, och varje ring är ett slags ackord:

| Ring | Innehåll | Exempel vid C |
|------|----------|---------------|
| Ytterst | Durackord | C |
| Mitten | Mollackord (relativ moll) | Am |
| Innerst | Förminskade ackord | B° |

Poängen är att de sju ackorden i en tonart alltid bildar samma lilla *block* på ringarna, oavsett tonart:

| Ring | Steg |
|------|------|
| Ytterst | IV · **I** · V (grannarna F · C · G) |
| Mitten | ii · vi · iii (Dm · Am · Em) |
| Innerst | vii° (B°, under C) |

Man hittar alltså tonartens ackord genom att titta på tre kolumner och inte räkna ut dem. I moll gäller blocket för naturlig moll. Dominanten och ledtonsackordet ur harmonisk moll (E och G♯° i a-moll) ligger utanför blocket och markeras för sig. Vrider man blocket ett steg medurs är man i G-dur (IV = C, I = G, V = D). Det förklarar också varför kvintcirkeln används för att modulera: grannarna delar nästan alla sina ackord.

Andra varianter som finns och som vi kan ta med:
- **Roterande stegring:** en ring med I, ii, iii … som man vrider så att I pekar på vald tonart.
- **Septimaringar:** samma hjul med septimackord (Cmaj7, Am7, Bø7), och en dominantring (C7 → F7 → B♭7) som visar kvintfall, den vanligaste ackordrörelsen.
- **Moduskarta:** en rad per modus. C lydisk har samma förtecken som G-dur, C jonisk som C-dur, C mixolydisk som F-dur och så vidare nedåt till lokrisk. Varje modus är samma cirkel förskjuten, och raderna visar hur "ljus" eller "mörk" en modus är. Bygger på kyrkotonarterna från M3.
- **Camelot-hjulet:** samma ringar med nummer 1A–12B som DJ:ar använder för att mixa låtar i kompatibla tonarter.
- **Kvintcirkeln som inte stänger sig:** tolv rena kvinter blir något större än sju oktaver (cirka 23,5 cent, det pytagoreiska kommat), därför är instrument temperade. Man kan lyssna på skillnaden.

Uppgifter: alla är klara, senast Camelot-koden in och ut (M7-09b). Pilar för sekundärdominanter på cirkeln ligger under M8-03b och UI-04b.

## M8 – Harmoni och progressioner 🚧

Mål: Gå från att slå upp enskilda ackord till att förstå hur de hänger ihop i en låt. Begreppen nedan kan vara nya, så här är en kort förklaring av var och en:

- **Ackordföljder:** I–V–vi–IV, ii–V–I, 12-takts blues m.fl. som stegnummer i valfri tonart.
- **Modal harmoni:** ackord ur en modus i stället för dur eller moll. D-dorisk har ett durackord på fjärde steget (G), C-mixolydisk ett B♭ på sjunde. Ackorden som har modusens karaktärston (dorisk ♮6, lydisk ♯4) är de som får den att höras.
- **Sekundära dominanter:** en dominant till ett annat steg än tonikan. D7 är dominant till G och kan lånas in i C-dur som V7/V. Ger en ton utanför tonarten (F♯) och mycket framåtrörelse.
- **Lånade ackord (modal interchange):** ackord lånade från parallellmollen i en durtonart, t.ex. A♭, B♭ och Fm i C-dur. Ger det "mörka" som många poplåtar har.
- **Tritonussubstitution:** G7 byts mot D♭7. Båda innehåller tritonen B–F (som bara byter roll), och D♭7 → C ger en kromatisk basgång. Standard inom jazz.
- **Kadenser:** de små avslutsformlerna: autentisk (V–I), plagal (IV–I), halv (slutar på V) och bedräglig (V–vi).
- **Stämledning (voice leading):** hur man går mellan två ackord med så liten rörelse som möjligt. C till Am behöver bara flytta G till A.
- **Ackord–skala-teori:** vilka skalor som passar över ett ackord (Cmaj7: jonisk eller lydisk, C7: mixolydisk eller alterad). Bygger på skalorna från M3.
- **Modulering och pivotackord:** ackord som finns i två tonarter och därför kan byta mellan dem. C och G delar C, Em, G och Am.
- **Symmetriska strukturer:** ett dim7-ackord delar oktaven i fyra lika delar, så C°7, E♭°7, G♭°7 och A°7 spelas på samma tangenter. Tonerna stavas ändå olika (C°7 har B𝄫 där A°7 har A), och vilken stavning som är rätt avgörs av ackordets funktion i tonarten. Förstorade treklanger, helton- och oktatonisk skala är symmetriska på liknande sätt.
- **Kromatiska klassiker:** det neapolitanska sextackordet (♭II i första omvändning) och de övermåttliga sextackorden, där det tyska (A♭–C–E♭–F♯ i C) låter som A♭7 men stavas annorlunda och därför är ett bra exempel på vår regel att alltid stava toner.
- **Tonnetz (neo-Riemannsk teori):** ett nät där treklanger är trianglar, och C-dur når Cm, Am och Em med ett enda tonflyttande steg (P, R och L). Experimentellt.
- **Negativ harmoni:** ett ackord speglas runt axeln mellan grundton och kvint. C-dur blir C-moll. Experimentellt.

## M9 – Öva 💡

Mål: Appen blir även ett träningsverktyg: stava ackord och skalor själv, hör kvaliteten på ett ackord och koppla förtecken till tonart. Allt rättas av teorimodulen, och stavningen räknas (D♯ är fel där E♭ efterfrågas).

## X – Tvärgående förbättringar ⏳

- ✅ Delbara länkar som sparar valet i URL:en (`#/Db/major`), med instrumentet kom ihåg (X-01, X-08).
- ✅ Valbar enharmonisk stavning (C♯-dur i stället för D♭-dur) (X-04) och pianot beskuret på mobil (X-06).
- ✅ CI: GitHub Actions som kör Docker-bygget (X-02).
- ✅ Lint och formattering med ESLint och Prettier, i Docker-bygget (X-03).
- ✅ Visning på gitarrhals som alternativ till pianot (X-07), fyra band i taget med spelbara ackordgrepp och skallägen (G-01). Andra stämningar och vänsterhänt hals finns (G-02). Fingersättning, varianter av grepp och kvintackord med dämpade strängar finns också (G-03–G-05).
- ✅ Tonvisning: tangenter och band kan visa tonnamn, intervall (R, ♭3, 5, ♭7), steg eller ingenting, där facit visas på begäran (X-10).
- ✅ Mörkt tema med växel (System, Light, Dark) som kommer ihåg valet och sätts före första ritningen (X-09).
- ⏳ Förslag på gränssnitt: senaste och favoriter (X-11), jämför två ackord (X-12), notskrift (X-13), tillgänglighet (X-14) och mobilanpassning (X-15).
- ⏳ Språk och notnamn: svenska/engelska och B/H, solfège och Nashville-nummer (X-16).
- ⏳ Ljud och in/ut: fler klanger och tempo (X-17), Web MIDI (X-18), dela och exportera (X-19).
- ⏳ Fler instrument: ukulele, bas, mandolin och banjo (G-06).
- ✅ Städning av gränssnittet (UI-01–UI-04): ackord och skalor i var sin flik, en inställningssida för stränginstrumentet (antal strängar, stämning per sträng, förval) i stället för en lista med instrument, fler skalor och "Find from notes" (vilka skalor har de här tonerna), och tonartspanelen vid kvintcirkeln uppdelad i ämnen med en rad om var ämnet syns på cirkeln.
- ⏳ Teknik: PWA som fungerar offline (X-20) och Playwright-tester mot den byggda imagen (X-21).
