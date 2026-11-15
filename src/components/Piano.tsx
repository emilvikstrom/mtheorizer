import { type Chord, type VoicedTone, formatNote, midiOf, rootPosition } from '../theory';
import { ToneLegend } from './ToneLegend';

const LOWEST_OCTAVE = 4;
const OCTAVES = 2;
const FIRST_MIDI = midiOf(0, LOWEST_OCTAVE); // C4

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

/** Key positions for C4–B5. Black keys sit centred on the gap between two white keys. */
const KEYS: readonly KeyShape[] = (() => {
  const keys: KeyShape[] = [];
  let whiteCount = 0;
  for (let i = 0; i < 12 * OCTAVES; i++) {
    const midi = FIRST_MIDI + i;
    if (BLACK_PITCH_CLASSES.has(i % 12)) {
      keys.push({ midi, black: true, x: whiteCount * WHITE_WIDTH - BLACK_WIDTH / 2 });
    } else {
      keys.push({ midi, black: false, x: whiteCount * WHITE_WIDTH });
      whiteCount++;
    }
  }
  return keys;
})();

const WHITE_KEYS = KEYS.filter((k) => !k.black);
const BLACK_KEYS = KEYS.filter((k) => k.black);
const WIDTH = WHITE_KEYS.length * WHITE_WIDTH;

function PianoKey({ shape, tone }: { shape: KeyShape; tone: VoicedTone | undefined }) {
  const width = shape.black ? BLACK_WIDTH : WHITE_WIDTH;
  const height = shape.black ? BLACK_HEIGHT : WHITE_HEIGHT;
  const centre = shape.x + width / 2;
  const isC = (shape.midi - FIRST_MIDI) % 12 === 0;
  const classes = [
    'key',
    shape.black ? 'key--black' : 'key--white',
    tone && (tone.role === 'root' ? 'key--root' : 'key--tone'),
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
            C{Math.floor(shape.midi / 12) - 1}
          </text>
        )
      )}
    </g>
  );
}

interface PianoProps {
  chord: Chord;
}

/** Two octaves (C4–B5) with the chord in root position highlighted. */
export function Piano({ chord }: PianoProps) {
  const voiced = rootPosition(chord, LOWEST_OCTAVE);
  const toneAt = new Map(voiced.map((tone) => [tone.midi, tone]));
  const description = `Piano keyboard showing ${chord.name}: ${voiced
    .map((tone) => formatNote(tone.note))
    .join(', ')}`;

  return (
    <figure className="piano">
      <svg
        className="piano__svg"
        role="img"
        aria-label={description}
        viewBox={`-1 -1 ${WIDTH + 2} ${WHITE_HEIGHT + 2}`}
      >
        <title>{description}</title>
        {WHITE_KEYS.map((shape) => (
          <PianoKey key={shape.midi} shape={shape} tone={toneAt.get(shape.midi)} />
        ))}
        {BLACK_KEYS.map((shape) => (
          <PianoKey key={shape.midi} shape={shape} tone={toneAt.get(shape.midi)} />
        ))}
      </svg>
      <ToneLegend />
    </figure>
  );
}
