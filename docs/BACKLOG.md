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

_Ackordbyggaren (M6) först, sedan utbyggd kvintcirkel (M7)._

- [ ] **M6-03** Namngivning: `chordSymbolFor(root, spec)` och `chordNameFor(spec)` ger ackordsymbol och namn för varje spec (Cm7♭5, C7♯9, C13, Csus4(add9)), och `identifyQuality(spec)` hittar motsvarande namngivna typ om det finns
  - Acceptans: alla 43 typer ger exakt sin nuvarande symbol och sitt nuvarande namn när de går via spec. Reglerna (när "add" skrivs, när ♯9 står inom parentes, att 9/11/13 innebär en septima) är tabelltestade för alla kombinationer som `availableQualities` tillåter
- [ ] **M6-04** Byggar-UI som ersätter ackordväljaren: grundtonsväljaren som förut, en rad med de sju grundackorden (C, Cm, C°, C+, Csus2, Csus4, C5 med vald grundton) och under den kvaliteterna som knappar att slå av och på, grupperade (Seventh, Sixth, Extensions, Altered, Added). Byte av grundackord behåller de kvaliteter som fortfarande är tillgängliga. Bara det som `availableQualities` ger visas, och en grupp utan något tillgängligt döljs helt. Ackordsymbolen, tonerna, pianot och gitarren uppdateras direkt
  - Acceptans: alla 43 typer går att bygga med klick, och den gamla ackordväljaren (`ChordQualityPicker`) är borttagen. Knapparna är växlingsknappar (`aria-pressed`) med etiketter, och när en knapp försvinner för att ett val ändrats hamnar fokus på gruppen i stället för att tappas. Fungerar i 375 px bredd. Testerna för ackordväljaren skrivs om för byggaren
- [ ] **M6-05** Byggda ackord i länk, ljud och vyer: länken beskriver grundackord och kvaliteter (`#/C/minor?with=7,9`), och gamla länkar (`#/Db/major`, `#/C/dominant7Sharp9`) öppnar samma ackord i byggaren. Omvändningar, uppspelning, piano och gitarrhals fungerar för alla specar
  - Acceptans: rundtur länk → spec → länk för alla 43 typer och ett urval fria. Ogiltiga kombinationer i länken normaliseras som i M6-02. Gitarrvyn visar ett tydligt meddelande ("No playable shape in this position") när greppsökningen inte hittar något för ett ovanligt ackord, i stället för tom hals. Valet sparas som förut när man byter flik
- [ ] **M7-01** Teorimodul för kvintcirkelns ringar: `ringChords(position)` ger durackord (ytterst), relativ moll (mitten) och förminskat ackord (innerst, vii° i durtonarten och ii° i mollen) för varje position, och `diatonicBlock(key)` ger de sju diatoniska ackorden som positioner på ringarna (IV I V ytterst, ii vi iii i mitten, vii° innerst). Byggs på `diatonicTriads`, `circlePosition` och `harmonicMinorDominant` i `keys.ts` i stället för som ett parallellt API
  - Acceptans: blocket får samma form för alla 12 durtonarter och för de relativa molltonarterna (förskjutningarna är desamma, bara mittpunkten flyttas). Stavningen följer tonartens förtecken (B° i C-dur, F♯° i G-dur, C° i D♭-dur). Tabelltestat på alla positioner
  - Harmonisk moll: V (E i a-moll) och vii° (G♯°) ligger utanför blocket (E i yttre ringen fyra positioner medurs, G♯° i inre ringen tre positioner medurs). `diatonicBlock` ger dem separat med sina positioner så att M7-03 kan markera dem för sig
- [ ] **M7-02** Kvintcirkeln med tre ringar i SVG: durtonarter ytterst, molltonarter i mitten och förminskade ackord innerst, med en växel som visar en, två eller tre ringar
  - Acceptans: de befintliga funktionerna finns kvar (val med klick och piltangenter, enharmonisk stavning, antal förtecken). Positionerna med två namn (B/C♭, F♯/G♭, D♭/C♯) visar båda i alla ringar. I `CircleOfFifthsView.test.tsx` täcks ringväxlingen
  - Mitten: idag visar mittcirkeln (radie 100 av 300) tonartens namn och förtecken. Den förminskade ringen och stegringen i M7-04 tar den platsen, så namn och förtecken flyttar till tonartspanelen eller till en mindre mitt. Bestäm i uppgiften
  - Mobil: vid 375 px bredd blir de inre ringarnas segment omkring 20–40 px. Därför väljer ett tryck var som helst i en sektor (alla ringar) positionen, så att träffytan är hela sektorn, och vilket ackord i sektorn som öppnas väljs i panelen
- [ ] **M7-03** Visa tonartens sju ackord som ett block på ringarna: vald tonart färgmarkerar de sju positionerna och skriver stegnummer (I–vii°) och funktion (T/S/D) på dem. Ett klick på ett ackord i blocket öppnar det i ackordfliken som i M5-04
  - Acceptans: blocket flyttar sig med tonarten och byter mittpunkt mellan dur och moll. I moll markeras dessutom V och vii° ur harmonisk moll utanför blocket, med en egen markering och förklaring. Funktionsfärgerna förklaras i en teckenförklaring och bärs inte bara av färg (stegnumret står alltid). Testat med `diatonicBlock` för alla tonarter
- [ ] **M7-04** Roterande stegring: en inre ring med stegnummer (I, ii, iii, IV, V, vi, vii°) som man vrider så att I hamnar på vald tonart, och som animeras när tonarten byts (respekterar `prefers-reduced-motion`)
  - Acceptans: ringen pekar alltid på rätt ackord i alla tonarter och i både dur och moll. Utan animation byter den läge direkt. Kan tas bort från vyn med samma ringväxling som i M7-02

## Senare

Idéer i ungefärlig prioritetsordning inom varje grupp. Bryt ner och flytta upp till **Nästa** när milstolpen påbörjas. Förklaringar av begreppen finns i [ROADMAP.md](ROADMAP.md).

### M6 – Ackordbyggare, fortsättning

- [ ] **M6-06** Skriv ackordsymbol i ett sökfält: `parseChordSymbol("F#m7b5/C")` ger rot, spec och bas, och fältet hoppar till det ackordet
  - Acceptans: alla symboler som `chordSymbolFor` ger går att läsa tillbaka (rundtur för alla 43 typer × 12 grundtoner), samt vanliga varianter (Cmaj7, CM7, C△7, Cmin7, C-7, Cø, Cdim, C+). Felaktig inmatning ger ett begripligt felmeddelande. Snedackord ger omvändning när basen är en ackordton
- [ ] **M6-07** Identifiera ackord: `identifyChords(tones)` tar en uppsättning toner och ger alla ackordnamn som passar, bäst först (färre utelämnade toner och enklare namn först, snedackord när basen inte är grundton)
  - Acceptans: tonklasserna 0, 3, 6 och 9 ger C°7, D♯°7, F♯°7 och A°7 som likvärdiga alternativ, och C, E, G och A ger både C6 och Am7/C. Tabelltestat för alla ackordtyper på alla grundtoner. Indata är tonklasser (0–11), så grundtonen stavas med `preferredRootSpelling` (D♯°7 med två förtecken före E♭°7 med sex, eftersom E♭°7 innehåller B𝄫 och D𝄫)
- [ ] **M6-08** "What chord is this?": klicka på pianotangenter (eller bandpositioner på gitarren) och se vilka ackord tonerna bildar, med ett klick för att öppna förslaget i ackordfliken
  - Acceptans: bygger på M6-07. Tangenterna kan stängas av igen, och förslagen uppdateras direkt. Tomt val och ett enda val visar en vägledande text

### M7 – Utbyggd kvintcirkel, fortsättning

- [ ] **M7-05** Septimaringar: växla ringarnas innehåll mellan treklanger och fyrklanger (maj7, m7, m7♭5 och dominantseptimackord på V)
  - Acceptans: ringarna visar rätt septimackord för alla positioner, med stegnummer (Imaj7, ii7, iii7, IVmaj7, V7, vi7, viiø7), och funktionen i M7-03 följer med
- [ ] **M7-06** Kvintfall: markera de ackordkedjor som går moturs runt cirkeln (kvintfall: C → F → B♭ …, vi–ii–V–I) med pilar, och spela upp kedjan från vald tonart
  - Acceptans: kedjan visas för dur och moll, uppspelningen använder M4:s ljud och stoppas när man byter vy. Markeringen förklarar varför moturs är den vanligaste ackordrörelsen
- [ ] **M7-07** Moduskarta: en tabell med en rad per modus (lydisk, jonisk, mixolydisk, dorisk, eolisk, frygisk, lokrisk) och en kolumn per grundton, där raden visar vilken tonarts förtecken modusen har på kvintcirkeln (C lydisk = G-dur, C jonisk = C-dur, C mixolydisk = F-dur …)
  - Acceptans: bygger på kyrkotonarterna i `scales.ts`. Raden för en vald grundton går att jämföra med de andra, och varje cell öppnar skalan i skalfliken
- [ ] **M7-08** Kvintcirkeln som inte stänger sig: lyssna på tolv rena kvinter (3:2) jämfört med sju oktaver, och på liksvävande temperering, så att det pytagoreiska kommat (cirka 23,5 cent) hörs
  - Acceptans: beräkningen av cents och frekvenser ligger i teorimodulen och är tabelltestad (ren kvint ≈ 701,96 cent mot 700 cent). Ljudet spelas med Web Audio och förklaringen står i vyn
- [ ] **M7-09** Camelot-hjulet (DJ-vy): samma ringar med tonarterna numrerade 1A–12B, för harmonisk mixning
  - Acceptans: numreringen följer standarden (8B = C-dur, 8A = A-moll), och grannpositionerna (±1 och den relativa) markeras som kompatibla tonarter

### M8 – Harmoni och progressioner (fördjupande teori)

- [ ] **M8-01** Vanliga ackordföljder i valfri tonart: I–V–vi–IV, I–vi–IV–V, ii–V–I, 12-takts blues, Pachelbels kanon, i–♭VI–♭III–♭VII. Data i teorimodulen, visas som ackord med stegnummer, kan spelas upp och varje ackord går att öppna
  - Acceptans: tabelltestat för alla 12 tonarter (dur och moll), stavat efter tonarten (A♭–E♭–Fm–D♭ i A♭-dur). Följden går att länka till
- [ ] **M8-02** Följdbyggare: lägg till, ta bort och flytta ackord ur tonartens diatoniska ackord (och senare lånade och sekundära ackord) och se stegnummer och toner i hela följden
  - Acceptans: följden ligger i länken, kan spelas upp i loop och faller tillbaka till tom följd vid ogiltig länk. Stämledning i följden läggs till när M8-07 finns
- [ ] **M8-03** Sekundära dominanter: V7/x för varje diatoniskt steg (D7 → G i C-dur, kallas V7/V), med tonartsfrämmande ton markerad och en pil på kvintcirkeln
  - Acceptans: teorimodulen ger sekundärdominanten för alla steg i alla tonarter, rätt stavad (E7 → Am, B7 → Em, A7 → Dm). vii° av steg (sekundär ledtonsackord) kan läggas till
- [ ] **M8-04** Lånade ackord (modal interchange): ackord från parallellmollen i en durtonart (♭VI, ♭VII, ♭III, iv, ii°) och från parallelldur i moll, med varje ackords ursprung angivet
  - Acceptans: C-dur lånar Fm, A♭, B♭ och E♭ ur C-moll (rätt stavade), tabelltestat för alla tonarter. Visas bredvid de diatoniska ackorden
- [ ] **M8-05** Tritonussubstitution: ♭II7 i stället för V7 (D♭7 för G7, eftersom båda delar tritonen B–F), med förklaring och uppspelning av båda alternativen
  - Acceptans: `tritoneSubstitute(chord)` är tabelltestad för alla 12 dominantseptimackord och de delade tonerna visas stavade (G7: B–F, D♭7: F–C♭)
- [ ] **M8-06** Kadenser: autentisk (V–I), plagal (IV–I), halv (…–V) och bedräglig (V–vi) kadens i vald tonart, med spelbar uppspelning och en rad förklaring
  - Acceptans: alla fyra för alla tonarter, i dur och moll (V med harmonisk moll), rätt stavade
- [ ] **M8-07** Stämledning: för två ackord, visa gemensamma toner och välj de omvändningar som ger minst rörelse (C → Am: C och E ligger kvar och G → A, C7 → F: C ligger kvar och ledtonerna E → F och B♭ → A)
  - Acceptans: `voiceLeading(from, to)` är tabelltestad och ger summan av halvtonsrörelser. Pianot visar de två ackorden efter varandra med strecken som visar rörelsen
- [ ] **M8-08** Ackord–skala-teori: vilka skalor passar över ett ackord (Cmaj7: jonisk och lydisk, C7: mixolydisk, lydisk dominant och alterad, Cm7: dorisk och eolisk, Cm7♭5: lokrisk), och omvänt vilka ackord som passar i en skala
  - Acceptans: bygger på skalorna i `scales.ts`, men lydisk dominant och alterad skala saknas och läggs till som data. Förteckningen är data med tabelltester, och varje förslag öppnar skalan i skalfliken med ackordtonerna markerade
- [ ] **M8-09** Modulering via pivotackord: välj två tonarter och se vilka ackord de har gemensamt (C-dur och G-dur delar C, Em, G, Am) och föreslagna vägar mellan dem på kvintcirkeln
  - Acceptans: gemensamma ackord beräknas ur stavade toner för alla par av närliggande tonarter. Ett pivotackord kan läggas till i följdbyggaren (M8-02)
- [ ] **M8-10** Symmetriska ackord och skalor: dim7 delar oktaven i fyra lika stora delar (små ters) så att C°7, E♭°7, G♭°7 och A°7 spelas på samma tangenter men stavas olika (C°7 har B𝄫 där A°7 har A), förstorade treklanger likaså (C+, E+ och A♭+), och helton- och oktatonisk skala (hel–halv och halv–hel) upprepar sig efter få transponeringar
  - Acceptans: teorimodulen anger vilka grundtoner som delar tangenter (`enharmonicRoots`), och skalorna läggs till som data i `scales.ts` med tabelltest. Vyn förklarar att stavningen avgörs av ackordets funktion i tonarten, inte av klangen
- [ ] **M8-11** Klassiska kromatiska ackord: neapolitanskt sextackord (♭II i första omvändning, D♭/F i C) och de tre övermåttliga sextackorden (italienskt, franskt, tyskt: A♭–C–E♭–F♯ i C)
  - Acceptans: stavningen är rätt (F♯ och inte G♭ i det tyska) i alla tonarter, och det tyska visas bredvid dominantseptimackordet det låter som (A♭7) med förklaring
- [ ] **M8-12** Tonnetz och neo-Riemannsk teori: ett nät av toner där treklanger är trianglar och transformationerna P (parallell: C → Cm), L (ledton: C → Em) och R (relativ: C → Am) är grannar
  - Acceptans: teorimodulen har P, L och R för alla 24 treklanger (tabelltestade), vyn visar nätet med valt ackord markerat och klick på en granne flyttar dit. Experimentell idé, kan skippas
- [ ] **M8-13** Negativ harmoni (experimentell): spegla ett ackord i en tonart runt axeln mellan grundton och kvint (C-dur → C-moll, G7 → Fm6 i C)
  - Acceptans: `negativeOf(chord, key)` med tabelltest för diatoniska ackord i alla durtonarter, och visning bredvid originalet. Rätt stavade toner

### M9 – Öva

- [ ] **M9-01** Stavningsövning: appen frågar efter ett ackord eller en skala ("Spell E♭m7") och man klickar in tonerna på pianot eller skriver dem. Rättas mot teorimodulen, med poäng över sessionen
  - Acceptans: stavningen räknas som fel om rätt tonklass anges med fel stavning (D♯ i stället för E♭). Ett klick på en svart tangent säger inget om stavningen, så tonen får sin stavning i ett val efter klicket (D♯ / E♭), och vita tangenter kan stavas om (F♭, E♯, B𝄫). Frågorna kan begränsas till ackordgrupper (treklanger, septimackord …) och frågorna kan göras om med samma frö i länken
- [ ] **M9-02** Lyssningsövning: spela ett ackord och be användaren peka ut kvaliteten (dur, moll, dim, aug, maj7, 7, m7 …), med val av svårighetsgrad och omvändning
  - Acceptans: frågorna väljs slumpmässigt men går att göra reproducerbara (frö i länken). Facit visar tonerna på pianot efter svaret
- [ ] **M9-03** Förteckensövning: "Hur många förtecken har F♯-moll?" och "Vilken tonart har tre b?", med kvintcirkeln som facit
  - Acceptans: alla 24 tonarter frågas båda vägarna. Svaret rättas av `keys.ts`

### X – Tvärgående förbättringar

Gränssnitt:

- [ ] **X-09** Mörkt tema: följer `prefers-color-scheme` och har en växel som kommer ihåg valet. Alla ton- och funktionsfärger omgestaltas för mörk bakgrund
  - Acceptans: kontrast minst WCAG AA för text och för markerade toner på piano, gitarrhals och kvintcirkel i båda teman. Ingen blixt av fel tema vid sidladdning
- [ ] **X-10** Tonvisning: välj vad som skrivs på tangenter och band: tonnamn, intervall (R, 3, 5, ♭7), stegnummer eller inget (övningsläge, där facit visas på begäran)
  - Acceptans: gäller både piano och gitarr, och valet ligger i länken och minns. Intervallnamnen kommer ur ackordets roller, så ♭7 visas inte som ♯6
- [ ] **X-11** Senaste och favoriter: de senaste ackorden och skalorna visas som knappar som går att fästa som favoriter
  - Acceptans: sparas i localStorage och fungerar utan (try/catch). Går att rensa. Ett klick återställer hela valet (ton, typ, instrument, omvändning)
- [ ] **X-12** Jämför två ackord: lägg ett andra ackord bredvid det första, med gemensamma toner markerade på pianot och i listan
  - Acceptans: gemensamma toner beräknas på stavning och klingande tonklass (E♭ och D♯ skiljs åt men visas som samma tangent). Länken innehåller båda ackorden
- [ ] **X-13** Notskrift: visa ackordet eller skalan på ett notsystem (diskant- och basklav) med rätt förtecken, bredvid pianot
  - Acceptans: stavningen styr vilken notlinje tonen hamnar på (D♯ och E♭ ligger på olika linjer), tabelltestat för alla ackord. Dubbla förtecken fungerar. Komponent i SVG utan externa beroenden, eller ett bibliotek med pinnad version
- [ ] **X-14** Tillgänglighet: genomgång med tangentbord och skärmläsare. Textsammanfattning av varje diagram ("C major: C, E, G"), synliga fokusmarkeringar, markeringar som inte bara bärs av färg, respekt för `prefers-reduced-motion`
  - Acceptans: automatiska tillgänglighetstester (axe) körs i testsviten för alla flikar, och inga brott mot AA återstår. Axe i jsdom kan inte mäta kontrast, så kontrasten kontrolleras i Playwright (X-21) eller för hand
- [ ] **X-15** Mobilanpassning: spelknapparna fastnar i botten av skärmen, träffytor minst 44 px, och halsen går att bläddra med svepning
  - Acceptans: kontrollerat i 375 px bredd i både stående och liggande läge. Inga horisontella scrollbars utom på gitarrhalsen
- [ ] **X-16** Språk och notnamn: gränssnittet på svenska och engelska, och val av notnamn (B / H som i Sverige och Tyskland, där B♭ heter B; solfège do–re–mi; Nashville-nummer)
  - Acceptans: all gränssnittstext ligger i översättningsfiler, och språk och notnamn ligger i länken och minns. Notnamnen är en visningsfråga över de stavade tonerna, inte en ändring i teorin (H för B, B för B♭, His för B♯). Regeln i CLAUDE.md om engelsk gränssnittstext uppdateras

Ljud och in/ut:

- [ ] **X-17** Bättre ljud: val av klang (sinus, triangel, "plockad"), tempo och volym för uppspelningen, och att pianot och gitarren lyser upp tonerna medan de klingar
  - Acceptans: `playback.ts` planerar fortfarande med en ren och testad funktion, och klangerna väljs utan att uppspelningen ändrar sig. Inställningarna minns. Referensstämning (A4 = 440 Hz) går att ändra
- [ ] **X-18** Web MIDI: spela på ett anslutet MIDI-keyboard och se tonerna på pianot, och (med M6-07) vilket ackord de bildar
  - Acceptans: knappen visas bara när webbläsaren har Web MIDI, åtkomst begärs först vid klick, och att koppla från mitt i en session ger ett lugnt meddelande. MIDI-in ger ingen ändring av valet förrän användaren väljer det
- [ ] **X-19** Dela och exportera: knappar för att kopiera länken, kopiera tonerna som text ("C–E♭–G") och spara diagrammet som PNG eller SVG
  - Acceptans: använder Web Share när det finns och kopiering annars. Exporterade bilder har tonnamn och titel och fungerar i både ljust och mörkt tema

Instrument och kvalitet:

- [ ] **G-06** Fler stränginstrument: ukulele (GCEA), bas (EADG, fyra och fem strängar), mandolin (GDAE) och banjo, med samma gripsökning och skalpositioner som gitarren
  - Acceptans: antalet strängar styr greppsökningen (ingen hårdkodad sex), och tabelltest för några ackord per instrument. Instrumentet ligger i länken (`on=ukulele`)
  - Ukulele med hög G och femsträngad banjo har en sträng som inte är lägst trots sin plats i stämningen. Greppsökningen antar idag att den högst numrerade spelade strängen är basen och att den är grundtonen (`guitarShapes.ts`), så basen behöver bestämmas efter tonhöjd. Kravet att basen är grundtonen kan behöva släppas för ukulele
- [ ] **X-20** PWA: appen går att installera och fungerar utan nätverk (manifest, ikon och service worker som cachar byggd kod)
  - Acceptans: manifestet har namn, ikoner och `display`, och appen går att installera i Chrome. Ett Playwright-test (X-21) laddar appen, går offline, laddar om och ser att alla flikar fungerar. (Lighthouse har ingen PWA-kategori sedan version 12.) En ny version byter ut cachen utan att fastna på en gammal. Docker-bygget och nginx-konfigurationen uppdateras
- [ ] **X-21** Rök- och skärmbildstester med Playwright mot den byggda imagen: varje flik öppnas, ett ackord väljs och en skärmbild jämförs
  - Acceptans: körs i CI efter Docker-bygget, och avvikelser i skärmbilder ger en tydlig diff som artefakt. Lätt att köra lokalt med `docker compose`

## Klart

- [x] **M6-02** Tillgängliga kvaliteter: `availableQualities(spec)` ger de modifierare som kan läggas till på ackordet som det ser ut nu, enligt reglerna i planen (C5 inga, en septima i taget, 6 utan septima, 9/11/13 efter septima, ♭5 bara på C osv.). `normalizeSpec`, `withQuality`, `withoutQuality` och `withBase` tar bort det som berodde på något borttaget, och alla 43 typer nås genom att bara välja bland det som visas. Tabelltestat _(2026-11-16)_
- [x] **M6-01** Datamodell: `ChordSpec` (bas + modifierare, `src/theory/chordSpec.ts`), `buildChordFromSpec(root, spec)` och `specOf(qualityId)`. Alla 43 ackordtyper ger exakt samma toner, roller och `optional` som förut på alla 12 grundtoner, och fria kombinationer (C7♭5♭9) stavas rätt. Typerna i `chords.ts` ligger kvar som namnregister tills M6-03 och M6-04. `buildChordFromSpec` ger en `SpecChord` (rot, spec, toner) och får namn och symbol i M6-03 _(2026-11-16)_
- [x] **M3-03** Skalväljaren grupperas (Major & minor, Modes, Pentatonic & blues) och visar alias ("Major (Ionian)"). Skalvyn, länkarna och växeln till ackord fungerar för alla 13 skalor; byte till ackord ger treklangen på skalan (locrian → diminished) _(2026-11-16)_
- [x] **M3-02** Fler skalor: harmonisk och melodisk moll, de fem övriga kyrkotonarterna (dorian, phrygian, lydian, mixolydian, locrian), dur- och mollpentatonik samt moll- och durblues (13 skalor). Tabelltestade på alla 12 grundtoner (rätt tonhöjder, stavning och grundton med högst ett förtecken). Gitarrpositioner och pianot fungerar för skalor med fem–sju toner _(2026-11-16)_
- [x] **M2-06** Gitarrvyn anger vilka toner ett grepp utelämnar ("Without fifth (G)") under diagrammet och i dess beskrivning. Räknas i teorimodulen (`omittedTones`), tabelltestat för alla ackord och grundtoner _(2026-11-15)_
- [x] **G-05** Kvintackord (C5, "power chord") som ny ackordtyp i triadgruppen (grundton + kvint). Greppsökningen tillåter nu dämpade strängar även ovanför greppet: kvintackord spelas på två–tre av de lägsta strängarna (x355xx, 8 10 10 x x x, 0 2 2 x x x) med övriga dämpade. Övriga ackord spelar som förut alla strängar från basen upp till sträng 1. Barré korsar dämpade strängar _(2026-11-15)_
- [x] **M2-05** Fler ackord: 7♭13, 7♯5♯9, m(maj9), 13sus4 samt add2 och add4 som egna namn (43 ackordtyper, tabelltestade på alla 12 grundtoner). Snedackord: omvändningar skrivs som C/E och visas i ackordrubriken (`inversionSymbol`) _(2026-11-15)_
- [x] **G-04** Fler varianter av samma grepp: varje läge på halsen visar nu även varianter som spelar lika många strängar och toner som det bästa greppet och kräver högst ett finger till (B♭: x10331 och x13331, C: x32010 och x32013). Det lättaste kommer först, och stegningen med pilarna skiljer varianter i samma läge åt _(2026-11-15)_
- [x] **G-03** Fingersättning i greppen: varje tryckt ton får en liten bricka med fingret (1 = pekfinger … 4 = lillfinger), barré markeras med ett band över strängarna och fingrarna ingår i diagrammets beskrivning (`fingers x 3 2 – 1 –`). Räknas i teorimodulen (`fingeringFor`), tabelltestat för alla ackord _(2026-11-15)_
- [x] **G-02** Andra stämningar och vänsterhänt hals: väljare för stämning (Standard, Drop D, DADGAD) och hand (höger/vänster) när gitarren visas. Greppsökning och skallägen följer stämningen, vänsterhänt hals är spegelvänd, och valen ligger i länken (`&tuning=dropD&hand=left`) _(2026-11-15)_
- [x] **M5-04** Diatoniska ackord i kvintcirkelfliken är knappar: ett klick öppnar ackordet i ackordfliken (stavat som i tonarten, t.ex. B° i A-moll), och länken uppdateras _(2026-11-15)_
- [x] **M4-01** Spela upp ackord och skalor med Web Audio: knapparna "Play chord" (samklang) och "Play broken" (brutet, nerifrån och upp) för ackord i valt läge, och "Play scale" för skalor. Knapparna döljs om webbläsaren saknar Web Audio _(2026-11-15)_
- [x] **X-01** Delbar länk till valt ackord: valet syns i URL:en (`#/Db/major?on=piano`, skala `#/A/scale/naturalMinor`, kvintcirkel `#/circle/Eb/major`; `s` är kors och `b` är b) och sidan öppnas med det valet. Bakåt/framåt fungerar, ogiltiga länkar faller tillbaka till C-dur, och flik, tonart och omvändning går att länka till _(2026-11-15)_
- [x] **X-04** Välj enharmonisk stavning själv: för svarta tangenter visas en väljare (C♯ eller D♭) för både ackord och skalor. Ett eget val behålls när man byter ackordtyp, och en automatisk stavning följer ackordet som förut _(2026-11-15)_
- [x] **X-06** Bättre pianovisning på mobil: på skärmar smalare än 600 px visas bara delen av tangentbordet kring tonerna (minst åtta vita tangenter), så etiketterna blir ungefär dubbelt så stora _(2026-11-15)_
- [x] **X-08** Kom ihåg valet piano/gitarr: instrumentet ligger i länken (`on=guitar`) och sparas i localStorage för länkar som inte anger något _(2026-11-15)_
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
