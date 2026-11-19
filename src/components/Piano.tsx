import { type KeyboardEvent, useSyncExternalStore } from "react";
import { type KeyboardTone, formatNote, midiOf } from "../theory";
import { type ToneDisplay, toneLabel } from "../toneLabels";
import { ToneLegend } from "./ToneLegend";

/** The keyboard always shows at least C4–B5; it grows by whole octaves for wider chords. */
const MIN_OCTAVE = 4;
const MAX_OCTAVE = 5;

const WHITE_WIDTH = 40;
const WHITE_HEIGHT = 160;
const BLACK_WIDTH = 24;
const BLACK_HEIGHT = 100;
const BLACK_PITCH_CLASSES = new Set([1, 3, 6, 8, 10]);

/** Below this width the keyboard shows only the part around the tones, so the labels stay readable. */
const NARROW_QUERY = "(max-width: 600px)";
/** Even a single note gets about an octave of keyboard around it. */
const MIN_VISIBLE_WHITE_KEYS = 8;
const MARGIN_WHITE_KEYS = 1;

function subscribeNarrow(listener: () => void) {
  const query = window.matchMedia?.(NARROW_QUERY);
  query?.addEventListener("change", listener);
  return () => query?.removeEventListener("change", listener);
}

const isNarrow = () => window.matchMedia?.(NARROW_QUERY).matches ?? false;

export interface KeyShape {
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

/**
 * The stretch of the keyboard to show on a narrow screen: all of `tones` with a
 * white key to spare on each side, at least `MIN_VISIBLE_WHITE_KEYS` wide, and
 * never past either end of the keyboard.
 */
export function visibleSpan(
  keys: readonly KeyShape[],
  tones: readonly KeyboardTone[],
): { x: number; width: number } {
  const total = keys.filter((k) => !k.black).length * WHITE_WIDTH;
  const shapes = keys.filter((k) => tones.some((t) => t.midi === k.midi));
  if (shapes.length === 0) return { x: 0, width: total };
  const left = Math.min(...shapes.map((k) => k.x)) - MARGIN_WHITE_KEYS * WHITE_WIDTH;
  const right =
    Math.max(...shapes.map((k) => k.x + (k.black ? BLACK_WIDTH : WHITE_WIDTH))) +
    MARGIN_WHITE_KEYS * WHITE_WIDTH;
  const width = Math.min(total, Math.max(right - left, MIN_VISIBLE_WHITE_KEYS * WHITE_WIDTH));
  const centred = (left + right) / 2 - width / 2;
  return { x: Math.min(Math.max(centred, 0), total - width), width };
}

const octaveOf = (midi: number) => Math.floor(midi / 12) - 1;

/** Names for the keys' accessible labels, which can't tell C♯ from D♭. */
const NOTE_NAMES = ["C", "C♯/D♭", "D", "D♯/E♭", "E", "F", "F♯/G♭", "G", "G♯/A♭", "A", "A♯/B♭", "B"];

function PianoKey({
  shape,
  tone,
  display,
  shared,
  sounding,
  onToggle,
}: {
  shape: KeyShape;
  tone: KeyboardTone | undefined;
  display: ToneDisplay;
  /** Marks the key with a dot: a tone the compared chords have in common. */
  shared: boolean;
  /** The key's tone is sounding now: a dashed outline and a bar under the key, besides the colour. */
  sounding: boolean;
  onToggle?: (midi: number) => void;
}) {
  const width = shape.black ? BLACK_WIDTH : WHITE_WIDTH;
  const height = shape.black ? BLACK_HEIGHT : WHITE_HEIGHT;
  const centre = shape.x + width / 2;
  const isC = shape.midi % 12 === 0;
  const label = tone ? toneLabel(display, tone) : undefined;
  const classes = [
    "key",
    shape.black ? "key--black" : "key--white",
    tone && (tone.isRoot ? "key--root" : "key--tone"),
    tone?.isBass && "key--bass",
    onToggle && "key--pressable",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <g
      className={classes}
      data-midi={shape.midi}
      data-highlighted={tone ? "true" : undefined}
      data-role={tone?.role}
      data-bass={tone?.isBass ? "true" : undefined}
      data-shared={shared ? "true" : undefined}
      data-sounding={sounding ? "true" : undefined}
      {...(onToggle
        ? {
            role: "button",
            tabIndex: 0,
            "aria-pressed": tone !== undefined,
            "aria-label": `${NOTE_NAMES[shape.midi % 12]}${octaveOf(shape.midi)}`,
            onClick: () => onToggle(shape.midi),
            onKeyDown: (event: KeyboardEvent) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              onToggle(shape.midi);
            },
          }
        : {})}
    >
      <rect x={shape.x} y={0} width={width} height={height} rx={shape.black ? 3 : 4} />
      {shared && <circle className="key__shared" cx={centre} cy={shape.black ? 14 : 20} r={5} />}
      {sounding && (
        <rect
          className="key__sounding"
          x={shape.x + 3}
          y={height - 8}
          width={width - 6}
          height={5}
          rx={2}
        />
      )}
      {label !== undefined ? (
        <text
          className="key__label"
          x={centre}
          y={height - (shape.black ? 12 : 16)}
          textAnchor="middle"
        >
          {label}
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

const isShared = (tone: KeyboardTone | undefined, shared: ReadonlySet<number> | undefined) =>
  tone !== undefined && shared?.has(tone.midi % 12) === true;

const isSounding = (tone: KeyboardTone | undefined, sounding: ReadonlySet<number> | undefined) =>
  tone !== undefined && sounding?.has(tone.midi) === true;

interface PianoProps {
  /** Keys to highlight. */
  tones: readonly KeyboardTone[];
  /** What is shown, e.g. "C major" or "C major scale". */
  name: string;
  /** Legend for the highlighted keys: root/tonic, and the others. */
  legend: { root: string; tone: string };
  /** Makes the keys buttons that call this with the key's MIDI number. The keyboard is then always shown in full. */
  onToggleKey?: (midi: number) => void;
  /** What the highlighted keys say: their names (the default), intervals, steps, or nothing. */
  display?: ToneDisplay;
  /** Pitch classes to mark as common tones when two chords are compared. */
  shared?: ReadonlySet<number>;
  /** MIDI numbers that sound right now (see `useSounding`): the highlighted keys among them are marked. */
  sounding?: ReadonlySet<number>;
}

/** A keyboard from C4 to at least B5, wide enough for all of `tones`, with `tones` highlighted. */
export function Piano({
  tones,
  name,
  legend,
  onToggleKey,
  display = "names",
  shared,
  sounding,
}: PianoProps) {
  const narrow = useSyncExternalStore(subscribeNarrow, isNarrow, () => false);
  const midis = tones.map((tone) => tone.midi);
  const keys = keyboard(
    Math.min(MIN_OCTAVE, ...midis.map(octaveOf)),
    Math.max(MAX_OCTAVE, ...midis.map(octaveOf)),
  );
  const whiteKeys = keys.filter((k) => !k.black);
  const blackKeys = keys.filter((k) => k.black);
  const span =
    narrow && !onToggleKey
      ? visibleSpan(keys, tones)
      : { x: 0, width: whiteKeys.length * WHITE_WIDTH };
  const toneAt = new Map(tones.map((tone) => [tone.midi, tone]));
  // With the names hidden, the description does not give them away either.
  const description =
    display === "none"
      ? `Piano keyboard showing ${name}, tone labels hidden`
      : `Piano keyboard showing ${name}: ${tones.map((tone) => formatNote(tone.note)).join(", ")}`;

  return (
    <figure className="piano">
      <svg
        className="piano__svg"
        role={onToggleKey ? "group" : "img"}
        aria-label={description}
        viewBox={`${span.x - 1} -1 ${span.width + 2} ${WHITE_HEIGHT + 2}`}
      >
        <title>{description}</title>
        {whiteKeys.map((shape) => (
          <PianoKey
            key={shape.midi}
            shape={shape}
            tone={toneAt.get(shape.midi)}
            display={display}
            shared={isShared(toneAt.get(shape.midi), shared)}
            sounding={isSounding(toneAt.get(shape.midi), sounding)}
            onToggle={onToggleKey}
          />
        ))}
        {blackKeys.map((shape) => (
          <PianoKey
            key={shape.midi}
            shape={shape}
            tone={toneAt.get(shape.midi)}
            display={display}
            shared={isShared(toneAt.get(shape.midi), shared)}
            sounding={isSounding(toneAt.get(shape.midi), sounding)}
            onToggle={onToggleKey}
          />
        ))}
      </svg>
      <ToneLegend
        {...legend}
        bass={tones.some((tone) => tone.isBass)}
        shared={tones.some((tone) => isShared(tone, shared))}
      />
    </figure>
  );
}
