import {
  type Accidental,
  accidentalColumns,
  BOTTOM_LINE,
  type Clef,
  displacedSteps,
  formatNote,
  type KeyboardTone,
  ledgerLines,
  type Note,
  placeOnStaff,
  placeProgression,
  type StaffNote,
  type ProgressionChord,
  type StaffTone,
  type Tonality,
  type VoicedProgression,
  chordOnKeyboard,
  signatureStep,
  tonalitySignature,
} from "../theory";

/** Half the distance between two staff lines: one diatonic step. */
const STEP = 5;
const PAD = 8;
const LEFT = 6;
const CLEF_WIDTH = 34;
const SIGNATURE_WIDTH = 10;
const ACCIDENTAL_WIDTH = 11;
const NOTE_RX = 6.6;
const NOTE_RY = 4.4;
const SCALE_SPACING = 30;

/** Top line of the treble staff (F5) and of the bass staff (A3), in diatonic steps. */
const TOP_LINE: Record<Clef, number> = {
  treble: BOTTOM_LINE.treble + 8,
  bass: BOTTOM_LINE.bass + 8,
};

function accidentalGlyph(accidental: Accidental): string {
  if (accidental === 0) return "♮";
  if (accidental === 2) return "𝄪";
  if (accidental === -2) return "𝄫";
  return accidental > 0 ? "♯".repeat(accidental) : "♭".repeat(-accidental);
}

interface StaffProps {
  /** The tones to write: a chord's tones stacked, or a scale's tones one after another. */
  tones: readonly KeyboardTone[];
  kind: "chord" | "scale";
  /** Key signature to write at the start of each staff; the notes it covers get no accidental. */
  signature?: readonly Note[];
  /** What is shown, e.g. "C major". */
  name: string;
}

/**
 * The chord or scale on a staff, treble clef from middle C up and bass clef below,
 * with whole notes and the accidentals the key signature does not cover. Only the
 * clefs that hold a note are drawn.
 */
export function Staff({ tones, kind, signature = [], name }: StaffProps) {
  const placed = placeOnStaff(tones, signature);
  if (placed.length === 0) return null;

  const clefs: Clef[] = (["treble", "bass"] as const).filter((clef) =>
    placed.some((p) => p.clef === clef),
  );
  const steps = placed.map((p) => p.step);
  const topStep = Math.max(...steps, ...clefs.map((c) => TOP_LINE[c])) + 1;
  const bottomStep = Math.min(...steps, ...clefs.map((c) => BOTTOM_LINE[c])) - 1;
  const y = (step: number) => PAD + (topStep - step) * STEP;
  const height = (topStep - bottomStep) * STEP + 2 * PAD;

  const signatureWidth = signature.length * SIGNATURE_WIDTH + (signature.length > 0 ? 8 : 0);
  const columns = new Map(
    accidentalColumns(placed.filter((p) => p.sign !== undefined).map((p) => p.step)).map((c) => [
      c.step,
      c.column,
    ]),
  );
  const accidentalRoom =
    kind === "chord"
      ? (Math.max(-1, ...columns.values()) + 1) * ACCIDENTAL_WIDTH
      : ACCIDENTAL_WIDTH;
  const start = LEFT + CLEF_WIDTH + signatureWidth + 12 + accidentalRoom;
  const displaced = kind === "chord" ? displacedSteps(steps) : new Set<number>();

  const xOf = (p: StaffNote, i: number) =>
    kind === "chord"
      ? start + (displaced.has(p.step) ? NOTE_RX * 2 - 1 : 0)
      : start + i * SCALE_SPACING;
  const width =
    kind === "chord"
      ? start + NOTE_RX * 4 + 14
      : start + (placed.length - 1) * SCALE_SPACING + NOTE_RX + 16;

  const description = `Staff notation of ${name}: ${placed
    .map((p) => `${formatNote(p.note)}${p.octave}`)
    .join(", ")}`;

  return (
    <figure className="staff">
      <svg
        className="staff__svg"
        role="img"
        aria-label={description}
        viewBox={`0 0 ${width} ${height}`}
        style={{ maxWidth: `${Math.round(width * 2.2)}px` }}
      >
        <title>{description}</title>
        {clefs.map((clef) => (
          <g key={clef} className="staff__clef-group" data-clef={clef}>
            {[0, 2, 4, 6, 8].map((i) => (
              <line
                key={i}
                className="staff__line"
                x1={LEFT}
                x2={width - 2}
                y1={y(BOTTOM_LINE[clef] + i)}
                y2={y(BOTTOM_LINE[clef] + i)}
              />
            ))}
            <text
              className={`staff__clef staff__clef--${clef}`}
              x={LEFT}
              // The G clef curls around the G line (step 32), the F clef sits on the F line (step 24).
              y={clef === "treble" ? y(31) : y(23.4)}
              fontSize={clef === "treble" ? 50 : 36}
              aria-hidden="true"
            >
              {clef === "treble" ? "𝄞" : "𝄢"}
            </text>
            {signature.map((accidental, i) => (
              <text
                key={`${accidental.letter}${accidental.accidental}`}
                className="staff__signature"
                x={LEFT + CLEF_WIDTH + i * SIGNATURE_WIDTH}
                y={y(signatureStep(clef, accidental))}
                dominantBaseline="central"
                fontSize={17}
                aria-hidden="true"
              >
                {accidentalGlyph(accidental.accidental)}
              </text>
            ))}
          </g>
        ))}
        {placed.map((p, i) => {
          const x = xOf(p, i);
          const cy = y(p.step);
          const column = columns.get(p.step) ?? 0;
          return (
            <g
              key={`${p.midi}-${i}`}
              className={`staff__note${p.isRoot ? " staff__note--root" : ""}`}
              data-note={formatNote(p.note)}
              data-octave={p.octave}
              data-clef={p.clef}
              data-position={p.position}
              data-sign={p.sign}
            >
              {ledgerLines(p.clef, p.step).map((line) => (
                <line
                  key={line}
                  className="staff__ledger"
                  x1={x - NOTE_RX - 4}
                  x2={x + NOTE_RX + 4}
                  y1={y(line)}
                  y2={y(line)}
                />
              ))}
              {p.sign !== undefined && (
                <text
                  className="staff__accidental"
                  x={
                    start -
                    9 -
                    column * ACCIDENTAL_WIDTH +
                    (kind === "chord" ? 0 : i * SCALE_SPACING)
                  }
                  y={cy}
                  dominantBaseline="central"
                  textAnchor="end"
                  fontSize={17}
                  aria-hidden="true"
                >
                  {accidentalGlyph(p.sign)}
                </text>
              )}
              <ellipse className="staff__head" cx={x} cy={cy} rx={NOTE_RX} ry={NOTE_RY} />
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

interface NotationProps extends StaffProps {
  /** With the tone labels hidden the staff is too: it spells the answer out. */
  hidden: boolean;
}

/** The "Notation" section of the lookup view. */
export function Notation({ hidden, ...staff }: NotationProps) {
  return (
    <section className="notation" aria-labelledby="notation-title">
      <h3 id="notation-title" className="notation__title">
        Notation
      </h3>
      {hidden ? (
        <p className="notation__hint">The staff is hidden while the tone labels are off.</p>
      ) : (
        <Staff {...staff} />
      )}
    </section>
  );
}

/** Room above the staff for the chord symbols of a progression. */
const NAME_ROOM = 16;
const BARS_PER_ROW = 4;

interface ProgressionStaffProps {
  /** The chords, one to a bar: a symbol and the tones as they are played. */
  bars: readonly { readonly symbol: string; readonly tones: readonly StaffTone[] }[];
  /** The tonality's key signature, written at the start of each row. */
  signature: readonly Note[];
  /** What is shown, e.g. "I–V–vi–IV in C major". */
  name: string;
}

/**
 * A progression on the staff, one chord to a bar and four bars to a row, with the chord symbols
 * above. The key signature holds for the whole progression; an accidental holds to the bar line.
 */
export function ProgressionStaff({ bars, signature, name }: ProgressionStaffProps) {
  const placed = placeProgression(
    bars.map((b) => b.tones),
    signature,
  );
  const all = placed.flat();
  if (all.length === 0) return null;

  // Every row has the same clefs and height, so the rows line up.
  const clefs: Clef[] = (["treble", "bass"] as const).filter((clef) =>
    all.some((p) => p.clef === clef),
  );
  const steps = all.map((p) => p.step);
  const topStep = Math.max(...steps, ...clefs.map((c) => TOP_LINE[c])) + 1;
  const bottomStep = Math.min(...steps, ...clefs.map((c) => BOTTOM_LINE[c])) - 1;
  const y = (step: number) => PAD + NAME_ROOM + (topStep - step) * STEP;
  const height = (topStep - bottomStep) * STEP + 2 * PAD + NAME_ROOM;
  const top = y(TOP_LINE[clefs[0] ?? "treble"]);
  const bottom = y(BOTTOM_LINE[clefs[clefs.length - 1] ?? "treble"]);

  const columnsOf = (bar: readonly StaffNote[]) =>
    new Map(
      accidentalColumns(bar.filter((p) => p.sign !== undefined).map((p) => p.step)).map((c) => [
        c.step,
        c.column,
      ]),
    );
  const columns = placed.map(columnsOf);
  const accidentalRoom =
    (Math.max(-1, ...columns.flatMap((c) => [...c.values()])) + 1) * ACCIDENTAL_WIDTH;
  const barWidth = 14 + accidentalRoom + NOTE_RX * 4 + 14;
  const signatureWidth = signature.length * SIGNATURE_WIDTH + (signature.length > 0 ? 8 : 0);
  const start = LEFT + CLEF_WIDTH + signatureWidth;

  const rows: number[][] = [];
  for (let i = 0; i < placed.length; i += BARS_PER_ROW) {
    rows.push(placed.slice(i, i + BARS_PER_ROW).map((_, j) => i + j));
  }

  const description = `Staff notation of ${name}: ${placed
    .map(
      (bar, i) =>
        `bar ${i + 1}, ${bars[i]?.symbol ?? ""}: ${bar.map((p) => `${formatNote(p.note)}${p.octave}`).join(" ")}`,
    )
    .join("; ")}`;

  return (
    <figure className="staff staff--progression" role="img" aria-label={description}>
      {rows.map((row, r) => {
        const width = start + row.length * barWidth + 2;
        return (
          <svg
            key={r}
            className="staff__svg"
            aria-hidden="true"
            viewBox={`0 0 ${width} ${height}`}
            style={{ maxWidth: `${Math.round(width * 2)}px` }}
          >
            {clefs.map((clef) => (
              <g key={clef} className="staff__clef-group" data-clef={clef}>
                {[0, 2, 4, 6, 8].map((i) => (
                  <line
                    key={i}
                    className="staff__line"
                    x1={LEFT}
                    x2={width - 2}
                    y1={y(BOTTOM_LINE[clef] + i)}
                    y2={y(BOTTOM_LINE[clef] + i)}
                  />
                ))}
                <text
                  className={`staff__clef staff__clef--${clef}`}
                  x={LEFT}
                  y={clef === "treble" ? y(31) : y(23.4)}
                  fontSize={clef === "treble" ? 50 : 36}
                >
                  {clef === "treble" ? "𝄞" : "𝄢"}
                </text>
                {signature.map((accidental, i) => (
                  <text
                    key={`${accidental.letter}${accidental.accidental}`}
                    className="staff__signature"
                    x={LEFT + CLEF_WIDTH + i * SIGNATURE_WIDTH}
                    y={y(signatureStep(clef, accidental))}
                    dominantBaseline="central"
                    fontSize={17}
                  >
                    {accidentalGlyph(accidental.accidental)}
                  </text>
                ))}
              </g>
            ))}
            {row.map((index, j) => {
              const bar = placed[index] ?? [];
              const left = start + j * barWidth;
              const noteX = left + 14 + accidentalRoom;
              const displaced = displacedSteps(bar.map((p) => p.step));
              const last = index === placed.length - 1;
              return (
                <g key={index} className="staff__bar" data-bar={index + 1}>
                  <text
                    className="staff__chord-name"
                    x={noteX + NOTE_RX}
                    y={PAD + NAME_ROOM / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={12}
                  >
                    {bars[index]?.symbol}
                  </text>
                  {bar.map((p, k) => {
                    const x = noteX + (displaced.has(p.step) ? NOTE_RX * 2 - 1 : 0);
                    const cy = y(p.step);
                    const column = columns[index]?.get(p.step) ?? 0;
                    return (
                      <g
                        key={`${p.midi}-${k}`}
                        className={`staff__note${p.isRoot ? " staff__note--root" : ""}`}
                        data-note={formatNote(p.note)}
                        data-octave={p.octave}
                        data-clef={p.clef}
                        data-sign={p.sign}
                      >
                        {ledgerLines(p.clef, p.step).map((line) => (
                          <line
                            key={line}
                            className="staff__ledger"
                            x1={x - NOTE_RX - 4}
                            x2={x + NOTE_RX + 4}
                            y1={y(line)}
                            y2={y(line)}
                          />
                        ))}
                        {p.sign !== undefined && (
                          <text
                            className="staff__accidental"
                            x={noteX - 9 - column * ACCIDENTAL_WIDTH}
                            y={cy}
                            dominantBaseline="central"
                            textAnchor="end"
                            fontSize={17}
                          >
                            {accidentalGlyph(p.sign)}
                          </text>
                        )}
                        <ellipse className="staff__head" cx={x} cy={cy} rx={NOTE_RX} ry={NOTE_RY} />
                      </g>
                    );
                  })}
                  <line
                    className={`staff__barline${last ? " staff__barline--end" : ""}`}
                    x1={left + barWidth}
                    x2={left + barWidth}
                    y1={top}
                    y2={bottom}
                  />
                </g>
              );
            })}
          </svg>
        );
      })}
    </figure>
  );
}

interface ProgressionNotationProps {
  chords: readonly ProgressionChord[];
  tonality: Tonality;
  /** The smooth voicing when it is on; root position near middle C otherwise. */
  voiced: VoicedProgression | undefined;
  name: string;
}

/** The "Notation" section of the progression views: the chords as they are played. */
export function ProgressionNotation({ chords, tonality, voiced, name }: ProgressionNotationProps) {
  const bars = chords.map(({ chord }, i) => ({
    symbol: chord.symbol,
    tones:
      voiced?.voicings[i]?.map((t) => ({
        note: t.note,
        midi: t.midi,
        isRoot: t.role === "root",
      })) ?? chordOnKeyboard(chord),
  }));
  return (
    <section className="notation" aria-labelledby="progression-notation-title">
      <h3 id="progression-notation-title" className="notation__title">
        Notation
      </h3>
      <ProgressionStaff bars={bars} signature={tonalitySignature(tonality)} name={name} />
    </section>
  );
}
