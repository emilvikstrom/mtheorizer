import { type Chord, type FretPosition, STANDARD_TUNING, formatNote, fretboardPositions } from '../theory';
import { ToneLegend } from './ToneLegend';

const FRETS = 12;
const OPEN_COLUMN = 40; // room left of the nut for open strings
const FRET_WIDTH = 56;
const STRING_GAP = 30;
const BOARD_PADDING = 14; // board edge above the top string and below the bottom one
const TOP = BOARD_PADDING;
const DOT_RADIUS = 12;
const NUT_WIDTH = 5;

const NECK_START = OPEN_COLUMN;
const NECK_END = NECK_START + FRETS * FRET_WIDTH;
const STRING_COUNT = STANDARD_TUNING.length;
const BOARD_HEIGHT = (STRING_COUNT - 1) * STRING_GAP + 2 * BOARD_PADDING;
const FRET_NUMBER_Y = BOARD_HEIGHT + 18;
const WIDTH = NECK_END + 4;
const HEIGHT = FRET_NUMBER_Y + 6;

const SINGLE_INLAYS = [3, 5, 7, 9];
const DOUBLE_INLAY = 12;
const NUMBERED_FRETS = [3, 5, 7, 9, 12];

const stringY = (string: number) => TOP + (string - 1) * STRING_GAP;
/** Centre of the space behind a fret, where the finger goes; fret 0 is left of the nut. */
const fretCentreX = (fret: number) =>
  fret === 0 ? OPEN_COLUMN / 2 : NECK_START + (fret - 0.5) * FRET_WIDTH;
const midY = (a: number, b: number) => (stringY(a) + stringY(b)) / 2;

function ToneDot({ position }: { position: FretPosition }) {
  const x = fretCentreX(position.fret);
  const y = stringY(position.string);
  return (
    <g
      className={`fret-dot ${position.role === 'root' ? 'fret-dot--root' : 'fret-dot--tone'}`}
      data-highlighted="true"
      data-string={position.string}
      data-fret={position.fret}
      data-role={position.role}
    >
      <circle cx={x} cy={y} r={DOT_RADIUS} />
      <text className="fret-dot__label" x={x} y={y} textAnchor="middle" dominantBaseline="central">
        {formatNote(position.note)}
      </text>
    </g>
  );
}

interface FretboardProps {
  chord: Chord;
}

/** A guitar neck in standard tuning (frets 0–12) with every chord tone marked. */
export function Fretboard({ chord }: FretboardProps) {
  const positions = fretboardPositions(chord, STANDARD_TUNING, FRETS);
  const openStrings = new Set(positions.filter((p) => p.fret === 0).map((p) => p.string));
  const description = `Guitar neck showing ${chord.name}: ${chord.tones
    .map((tone) => formatNote(tone.note))
    .join(', ')}`;

  return (
    <figure className="fretboard">
      <div className="fretboard__scroll">
        <svg className="fretboard__svg" role="img" aria-label={description} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
          <title>{description}</title>
          <rect className="fretboard__board" x={NECK_START} y={0} width={NECK_END - NECK_START} height={BOARD_HEIGHT} />

          {SINGLE_INLAYS.map((fret) => (
            <circle key={fret} className="fretboard__inlay" cx={fretCentreX(fret)} cy={midY(3, 4)} r={6} />
          ))}
          <circle className="fretboard__inlay" cx={fretCentreX(DOUBLE_INLAY)} cy={midY(2, 3)} r={6} />
          <circle className="fretboard__inlay" cx={fretCentreX(DOUBLE_INLAY)} cy={midY(4, 5)} r={6} />

          {Array.from({ length: FRETS }, (_, i) => i + 1).map((fret) => {
            const x = NECK_START + fret * FRET_WIDTH;
            return <line key={fret} className="fretboard__fret" x1={x} y1={0} x2={x} y2={BOARD_HEIGHT} />;
          })}
          <rect className="fretboard__nut" x={NECK_START - NUT_WIDTH / 2} y={0} width={NUT_WIDTH} height={BOARD_HEIGHT} />

          {STANDARD_TUNING.map((open, index) => {
            const string = index + 1;
            const y = stringY(string);
            return (
              <g key={string}>
                <line
                  className="fretboard__string"
                  x1={NECK_START}
                  y1={y}
                  x2={NECK_END}
                  y2={y}
                  // Lower strings are thicker.
                  strokeWidth={1 + index * 0.35}
                />
                {!openStrings.has(string) && (
                  <text
                    className="fretboard__string-name"
                    x={fretCentreX(0)}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    {formatNote(open.note)}
                  </text>
                )}
              </g>
            );
          })}

          {NUMBERED_FRETS.map((fret) => (
            <text key={fret} className="fretboard__fret-number" x={fretCentreX(fret)} y={FRET_NUMBER_Y} textAnchor="middle">
              {fret}
            </text>
          ))}

          {positions.map((position) => (
            <ToneDot key={`${position.string}-${position.fret}`} position={position} />
          ))}
        </svg>
      </div>
      <ToneLegend />
    </figure>
  );
}
