import { type KeyboardTone, formatNote, midiOf } from '../theory';
import { ToneLegend } from './ToneLegend';

/** The keyboard always shows at least C4–B5; it grows by whole octaves for wider chords. */
const MIN_OCTAVE = 4;
const MAX_OCTAVE = 5;

const WHITE_WIDTH = 40;
const WHITE_HEIGHT = 160;
const BLACK_WIDTH = 24;
const BLACK_HEIGHT = 100;
const BLACK_PITCH_CLASSES = new Set([1, 3, 6, 8, 10]);

interface KeyShape {
  readonly midi: number;
  readonly black: boolean;
  readonly x: number;
}

/** Key positions for whole octaves `fromOctave`–`toOctave`. Black keys sit centred on the gap between two white keys. */
function keyboard(fromOctave: number, toOctave: number): KeyShape[] {
  const firstMidi = midiOf(0, fromOctave);
  const keys: KeyShape[] = [];
  let whiteCount = 0;
  for (let i = 0; i < 12 * (toOctave - fromOctave + 1); i++) {
    const midi = firstMidi + i;
    if (BLACK_PITCH_CLASSES.has(i % 12)) {
      keys.push({ midi, black: true, x: whiteCount * WHITE_WIDTH - BLACK_WIDTH / 2 });
    } else {
      keys.push({ midi, black: false, x: whiteCount * WHITE_WIDTH });
      whiteCount++;
    }
  }
  return keys;
}

const octaveOf = (midi: number) => Math.floor(midi / 12) - 1;

function PianoKey({ shape, tone }: { shape: KeyShape; tone: KeyboardTone | undefined }) {
  const width = shape.black ? BLACK_WIDTH : WHITE_WIDTH;
  const height = shape.black ? BLACK_HEIGHT : WHITE_HEIGHT;
  const centre = shape.x + width / 2;
  const isC = shape.midi % 12 === 0;
  const classes = [
    'key',
    shape.black ? 'key--black' : 'key--white',
    tone && (tone.isRoot ? 'key--root' : 'key--tone'),
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <g
      className={classes}
      data-midi={shape.midi}
      data-highlighted={tone ? 'true' : undefined}
      data-role={tone?.role}
    >
      <rect x={shape.x} y={0} width={width} height={height} rx={shape.black ? 3 : 4} />
      {tone ? (
        <text className="key__label" x={centre} y={height - (shape.black ? 12 : 16)} textAnchor="middle">
          {formatNote(tone.note)}
        </text>
      ) : (
        isC && (
          <text className="key__octave" x={centre} y={height - 16} textAnchor="middle">
            C{octaveOf(shape.midi)}
          </text>
        )
      )}
    </g>
  );
}

interface PianoProps {
  /** Keys to highlight. */
  tones: readonly KeyboardTone[];
  /** What is shown, e.g. "C major" or "C major scale". */
  name: string;
  /** Legend for the highlighted keys: root/tonic, and the others. */
  legend: { root: string; tone: string };
}

/** A keyboard from C4 to at least B5, wide enough for all of `tones`, with `tones` highlighted. */
export function Piano({ tones, name, legend }: PianoProps) {
  const midis = tones.map((tone) => tone.midi);
  const keys = keyboard(
    Math.min(MIN_OCTAVE, ...midis.map(octaveOf)),
    Math.max(MAX_OCTAVE, ...midis.map(octaveOf)),
  );
  const whiteKeys = keys.filter((k) => !k.black);
  const blackKeys = keys.filter((k) => k.black);
  const width = whiteKeys.length * WHITE_WIDTH;
  const toneAt = new Map(tones.map((tone) => [tone.midi, tone]));
  const description = `Piano keyboard showing ${name}: ${tones.map((tone) => formatNote(tone.note)).join(', ')}`;

  return (
    <figure className="piano">
      <svg
        className="piano__svg"
        role="img"
        aria-label={description}
        viewBox={`-1 -1 ${width + 2} ${WHITE_HEIGHT + 2}`}
      >
        <title>{description}</title>
        {whiteKeys.map((shape) => (
          <PianoKey key={shape.midi} shape={shape} tone={toneAt.get(shape.midi)} />
        ))}
        {blackKeys.map((shape) => (
          <PianoKey key={shape.midi} shape={shape} tone={toneAt.get(shape.midi)} />
        ))}
      </svg>
      <ToneLegend {...legend} />
    </figure>
  );
}
