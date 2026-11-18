import { type CSSProperties, type KeyboardEvent, useRef, useState } from "react";
import {
  type ChordQualityId,
  type ChordSize,
  type HarmonicFunction,
  type Key,
  type KeyMode,
  type KeySignature,
  type Note,
  type RingChord,
  camelotAt,
  circlePosition,
  compatibleKeys,
  degreeWheel,
  diatonicBlock,
  fifthsFall,
  formatKey,
  formatNote,
  keySignature,
  keysAt,
  noteEquals,
  ringChords,
} from "../theory";

/** How many rings to draw: major only, plus minor, plus diminished. */
export type RingCount = 1 | 2 | 3;

/** What a click on a chord does: pick its key, or open it in the chord tab. */
export type ClickAction = "key" | "chord";

type Ring = "major" | "minor" | "diminished";
type Radii = readonly [inner: number, outer: number];

const R_OUTER = 250;
const R_SIGNATURE = 274;

/** Inner and outer radius of each ring, per number of rings shown. */
const RING_RADII: Record<RingCount, Partial<Record<Ring, Radii>>> = {
  1: { major: [120, R_OUTER] },
  2: { major: [168, R_OUTER], minor: [100, 168] },
  3: { major: [182, R_OUTER], minor: [118, 182], diminished: [64, 118] },
};

const POSITIONS = Array.from({ length: 12 }, (_, position) => position);
const MODES: readonly KeyMode[] = ["major", "minor"];

/** Angle in degrees of the middle of `position`, with C at the top. */
const angleOf = (position: number) => -90 + position * 30;

function polar(radius: number, degrees: number): [number, number] {
  const radians = (degrees * Math.PI) / 180;
  return [radius * Math.cos(radians), radius * Math.sin(radians)];
}

const point = (radius: number, degrees: number) =>
  polar(radius, degrees)
    .map((v) => v.toFixed(2))
    .join(" ");

/** Ring segment between radii r1 < r2 and angles a0 < a1. */
function sectorPath(r1: number, r2: number, a0: number, a1: number): string {
  return [
    `M ${point(r2, a0)}`,
    `A ${r2} ${r2} 0 0 1 ${point(r2, a1)}`,
    `L ${point(r1, a1)}`,
    `A ${r1} ${r1} 0 0 0 ${point(r1, a0)}`,
    "Z",
  ].join(" ");
}

const shortName = (k: Key) => formatNote(k.tonic) + (k.mode === "minor" ? "m" : "");

export function signatureLabel(signature: KeySignature): string {
  const count = signature.accidentals.length;
  if (signature.kind === "none") return "0";
  return `${count}${signature.kind === "sharps" ? "♯" : "♭"}`;
}

const segmentId = (position: number, mode: KeyMode) => `${mode}-${position}`;

/** One of the key's chords as it sits on the rings. */
interface BlockInfo {
  readonly roman: string;
  readonly function?: HarmonicFunction;
  /** V or vii° of harmonic minor: outside the block of seven. */
  readonly harmonic: boolean;
  readonly chord: RingChord;
}

const blockKey = (ring: Ring, position: number) => `${ring}-${position}`;

const FUNCTION_LETTER: Record<HarmonicFunction, string> = {
  tonic: "T",
  subdominant: "S",
  dominant: "D",
};

/** The key's chords by ring and position: the block of seven, plus V and vii° of harmonic minor. */
function blockInfo(k: Key, size: ChordSize): Map<string, BlockInfo> {
  const block = diatonicBlock(k, size);
  const info = new Map<string, BlockInfo>();
  for (const { roman, function: fn, chord } of block.chords) {
    info.set(blockKey(chord.ring, chord.position), {
      roman,
      ...(fn ? { function: fn } : {}),
      harmonic: false,
      chord,
    });
  }
  if (block.harmonicMinor) {
    const { dominant, leadingTone } = block.harmonicMinor;
    const sevenths = size === "sevenths";
    info.set(blockKey("major", dominant.position), {
      roman: sevenths ? "V7" : "V",
      harmonic: true,
      chord: dominant,
    });
    info.set(blockKey("diminished", leadingTone.position), {
      roman: sevenths ? "vii°7" : "vii°",
      harmonic: true,
      chord: leadingTone,
    });
  }
  return info;
}

const blockClasses = (info: BlockInfo | undefined): string[] =>
  info
    ? [
        "is-block",
        ...(info.function ? [`is-${info.function}`] : []),
        ...(info.harmonic ? ["is-harmonic"] : []),
      ]
    : [];

/** The step number (and function letter) written near a segment's outer edge. */
function StepLabel({ info, radius, angle }: { info: BlockInfo; radius: number; angle: number }) {
  const [x, y] = polar(radius, angle);
  return (
    <text className="circle__step" x={x} y={y} textAnchor="middle" dominantBaseline="central">
      {info.roman}
      {info.function && ` ${FUNCTION_LETTER[info.function]}`}
    </text>
  );
}

/** A segment's label: the main name, and further spellings in smaller type below. */
function SegmentLabel({ names, x, y }: { names: readonly string[]; x: number; y: number }) {
  const [main, ...alternatives] = names;
  return (
    <text className="circle__label" x={x} y={y} textAnchor="middle" dominantBaseline="central">
      {alternatives.length === 0 ? (
        main
      ) : (
        <>
          <tspan x={x} dy="-0.45em">
            {main}
          </tspan>
          <tspan x={x} dy="1.15em" className="circle__alt">
            {alternatives.join(" ")}
          </tspan>
        </>
      )}
    </text>
  );
}

/**
 * The names written in a sector: the key's names for triads, or the seventh
 * chords of the ring (Cmaj7, Am7, Bm7♭5). Where the key's own chord sits in the
 * sector it replaces the ring's, so the dominant reads G7 and not Gmaj7.
 */
function chordLabels(
  ring: Ring,
  position: number,
  size: ChordSize,
  info: BlockInfo | undefined,
): string[] {
  return ringChords(position, size)[ring].map((c) =>
    info && noteEquals(c.root, info.chord.root) ? info.chord.symbol : c.symbol,
  );
}

interface SegmentProps {
  position: number;
  mode: KeyMode;
  radii: Radii;
  selected: boolean;
  size: ChordSize;
  info: BlockInfo | undefined;
  onSelect: () => void;
  register: (el: SVGGElement | null) => void;
}

function Segment({
  position,
  mode,
  radii,
  selected,
  size,
  info,
  onSelect,
  register,
}: SegmentProps) {
  const keys = keysAt(position, mode);
  const [r1, r2] = radii;
  const mid = angleOf(position);
  const [x, y] = polar((r1 + r2) / 2, mid);
  const classes = [
    "circle__segment",
    `circle__segment--${mode}`,
    ...blockClasses(info),
    selected && "is-selected",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <g
      ref={register}
      className={classes}
      role="radio"
      aria-checked={selected}
      aria-label={keys.map(formatKey).join(" / ")}
      tabIndex={selected ? 0 : -1}
      data-position={position}
      data-mode={mode}
      onClick={onSelect}
    >
      <path d={sectorPath(r1, r2, mid - 15, mid + 15)} />
      <SegmentLabel
        names={size === "sevenths" ? chordLabels(mode, position, size, info) : keys.map(shortName)}
        x={x}
        y={y}
      />
      {info && <StepLabel info={info} radius={r2 - 10} angle={mid} />}
    </g>
  );
}

interface DiminishedSegmentProps {
  position: number;
  radii: Radii;
  selected: boolean;
  size: ChordSize;
  info: BlockInfo | undefined;
  onSelect: () => void;
}

/**
 * The diminished chord at `position` (vii° of the major key, ii° of its
 * relative minor). It is a chord, not a key, so it is not part of the radio
 * group: a click anywhere in the sector selects the position and keeps the
 * current mode, and the keyboard uses the major and minor segments.
 */
function DiminishedSegment({
  position,
  radii,
  selected,
  size,
  info,
  onSelect,
}: DiminishedSegmentProps) {
  const [r1, r2] = radii;
  const mid = angleOf(position);
  // The ring is narrow: with a step label the chord name moves inward to make room.
  const [x, y] = polar((r1 + r2) / 2 - (info ? 7 : 0), mid);
  return (
    <g
      className={[
        "circle__segment",
        "circle__segment--diminished",
        ...blockClasses(info),
        selected && "is-selected",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
      data-position={position}
      data-ring="diminished"
      onClick={onSelect}
    >
      <path d={sectorPath(r1, r2, mid - 15, mid + 15)} />
      <SegmentLabel names={chordLabels("diminished", position, size, info)} x={x} y={y} />
      {info && <StepLabel info={info} radius={r2 - 10} angle={mid} />}
    </g>
  );
}

/**
 * The step ring in the hub: IV I V ii vi iii vii° (or VI III VII iv i v ii°
 * in a minor key) on the seven circle positions where the chords' roots are.
 * It is drawn with the tonic's neighbours around the top and the whole ring is
 * turned to the key, by the shortest way round, so the step numbers glide
 * when the key changes (the transition is switched off for
 * `prefers-reduced-motion` in the stylesheet). The labels are turned back so
 * they stay upright.
 */
function StepRing({ value, outer }: { value: Key; outer: number }) {
  const { position, steps } = degreeWheel(value);
  const inner = Math.max(14, outer - 46);
  const target = position * 30;
  const [turn, setTurn] = useState(target);
  // Take the shortest way round: from 11 to 0 is a step clockwise, not 330° back.
  const delta = mod12Degrees(target - turn);
  if (delta !== 0) setTurn(turn + delta);

  return (
    <g
      className="circle__wheel"
      aria-hidden="true"
      data-position={position}
      style={{ "--turn": `${turn}deg` } as CSSProperties}
    >
      {POSITIONS.map((slot) => {
        // Slot 0 of the ring is the key's own position; the ring offsets run -6…5.
        const offset = slot > 5 ? slot - 12 : slot;
        const step = steps.find((s) => s.offset === offset);
        const mid = -90 + offset * 30;
        const [x, y] = polar(outer - 14, mid);
        return (
          <g
            key={offset}
            className={[
              "circle__wheel-slot",
              step && "is-step",
              step?.function && `is-${step.function}`,
              step?.degree === 1 && "is-tonic",
            ]
              .filter(Boolean)
              .join(" ")}
            data-step={step?.roman}
            data-slot={step ? step.slot : undefined}
          >
            <path d={sectorPath(inner, outer, mid - 15, mid + 15)} />
            {step && (
              <text
                className="circle__wheel-label"
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
              >
                {step.roman}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

/** Radius of the arrows of the falling fifths, outside the key signatures. */
const R_FALL = 291;
const FALL_BADGE = 8;

/**
 * The chain of falling fifths (vi ii V I, or ii° V i) as numbered badges on
 * the rim joined by arrows that run counterclockwise: down a fifth, one
 * position at a time. The numbers give the order, so the chain does not rest
 * on colour alone.
 */
function FifthsFall({ value }: { value: Key }) {
  const steps = fifthsFall(value);
  // The arrows stop short of the badges, which are about 2° wide each.
  const gap = 4;
  return (
    <g className="circle__fall" data-testid="fifths-fall">
      <defs>
        <marker
          id="circle-fall-arrowhead"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" className="circle__fall-head" />
        </marker>
      </defs>
      {steps.slice(1).map((step, i) => {
        const from = steps[i];
        if (!from) return null;
        const a0 = angleOf(from.position) - gap;
        const a1 = angleOf(step.position) + gap;
        return (
          <path
            key={`${from.position}-${step.position}`}
            className="circle__fall-arrow"
            d={`M ${point(R_FALL, a0)} A ${R_FALL} ${R_FALL} 0 0 0 ${point(R_FALL, a1)}`}
            markerEnd="url(#circle-fall-arrowhead)"
          />
        );
      })}
      {steps.map((step, i) => {
        const [x, y] = polar(R_FALL, angleOf(step.position));
        return (
          <g key={step.position} className="circle__fall-badge" data-order={i + 1}>
            <circle cx={x} cy={y} r={FALL_BADGE} />
            <text x={x} y={y} textAnchor="middle" dominantBaseline="central">
              {i + 1}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/** `degrees` folded into the range -180…180. */
const mod12Degrees = (degrees: number) => ((((degrees + 180) % 360) + 360) % 360) - 180;

interface CircleOfFifthsProps {
  value: Key;
  onChange: (key: Key) => void;
  rings?: RingCount;
  /** Show the rotating step ring in the hub. Default: off. */
  stepRing?: boolean;
  /** Triads (default) or seventh chords (Cmaj7, Am7, Bm7♭5, with V7) on the rings. */
  chordSize?: ChordSize;
  /** What a click on one of the key's chords does. Default: select its key. */
  clickAction?: ClickAction;
  /** Mark the chain of falling fifths (vi ii V I) with numbered badges and arrows. Default: off. */
  fifthsFall?: boolean;
  /** Number the keys 1A–12B (Camelot) and outline the keys that mix well with the selected one. Default: off. */
  camelot?: boolean;
  onOpenChord?: (root: Note, quality: ChordQualityId) => void;
}

/**
 * The circle of fifths: major keys on the outer ring, their relative minors
 * inside it, the diminished chords innermost and the key signature outside.
 * The selected key's seven chords are marked as a block on the rings, each
 * with its step number and, for I, IV and V, its function (T, S, D). In a
 * minor key V and vii° of harmonic minor are marked outside the block. The
 * key's name and signature are shown by the panel next to the circle, so the
 * hub is left empty.
 */
export function CircleOfFifths({
  value,
  onChange,
  rings = 3,
  stepRing = false,
  chordSize = "triads",
  clickAction = "key",
  fifthsFall: showFall = false,
  camelot = false,
  onOpenChord,
}: CircleOfFifthsProps) {
  const segments = useRef(new Map<string, SVGGElement>());
  const radii = RING_RADII[rings];
  const diminishedRadii = radii.diminished;
  const selectedPosition = circlePosition(value);
  // Without the minor ring a minor key is shown by its relative major.
  const shownMode: KeyMode = radii.minor ? value.mode : "major";
  const hubRadius = Math.min(...Object.values(radii).map(([inner]) => inner));
  const block = blockInfo(value, chordSize);
  const compatible = camelot ? compatibleKeys(value) : [];
  const compatiblePositions = new Set(compatible.map(({ position }) => position));

  /** Open the key's chord on this ring and position, if it has one. */
  function openChord(ring: Ring, position: number) {
    const info = block.get(blockKey(ring, position));
    if (info) onOpenChord?.(info.chord.root, info.chord.quality);
  }

  function select(position: number, mode: KeyMode, focus = false) {
    if (clickAction === "chord" && !focus) {
      openChord(mode, position);
      return;
    }
    const [first] = keysAt(position, mode);
    if (!first) return;
    onChange(first);
    if (focus) segments.current.get(segmentId(position, mode))?.focus();
  }

  function onKeyDown(event: KeyboardEvent) {
    const moves: Record<string, [number, KeyMode]> = {
      ArrowRight: [selectedPosition + 1, shownMode],
      ArrowLeft: [selectedPosition + 11, shownMode],
      ArrowUp: [selectedPosition, "major"],
    };
    if (radii.minor) moves.ArrowDown = [selectedPosition, "minor"];
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      select(move[0] % 12, move[1], true);
    } else if (event.key === "Enter" || event.key === " ") {
      const target = (event.target as Element).closest<SVGGElement>("[data-position]");
      if (!target) return;
      event.preventDefault();
      select(Number(target.dataset.position), target.dataset.mode as KeyMode);
    }
  }

  return (
    <svg
      className={`circle${chordSize === "sevenths" ? " circle--sevenths" : ""}`}
      viewBox="-300 -300 600 600"
      role="radiogroup"
      aria-label="Circle of fifths. Arrow keys move around the circle and between major and minor."
      onKeyDown={onKeyDown}
    >
      {POSITIONS.flatMap((position) =>
        MODES.map((mode) => {
          const ringRadii = radii[mode];
          if (!ringRadii) return null;
          return (
            <Segment
              key={segmentId(position, mode)}
              position={position}
              mode={mode}
              radii={ringRadii}
              selected={position === selectedPosition && mode === shownMode}
              size={chordSize}
              info={block.get(blockKey(mode, position))}
              onSelect={() => select(position, mode)}
              register={(el) => {
                const id = segmentId(position, mode);
                if (el) segments.current.set(id, el);
                else segments.current.delete(id);
              }}
            />
          );
        }),
      )}

      {diminishedRadii &&
        POSITIONS.map((position) => (
          <DiminishedSegment
            key={`diminished-${position}`}
            position={position}
            radii={diminishedRadii}
            selected={position === selectedPosition}
            size={chordSize}
            info={block.get(blockKey("diminished", position))}
            onSelect={() =>
              clickAction === "chord"
                ? openChord("diminished", position)
                : select(position, shownMode)
            }
          />
        ))}

      {camelot && (
        <g aria-hidden="true">
          {compatible.map(({ position, mode, relation }) => {
            const ringRadii = radii[mode];
            if (!ringRadii || relation === "same") return null;
            const angle = angleOf(position);
            return (
              <path
                key={`${mode}-${position}`}
                className="circle__compatible"
                d={sectorPath(ringRadii[0], ringRadii[1], angle - 15, angle + 15)}
              />
            );
          })}
        </g>
      )}

      <g aria-hidden="true">
        {POSITIONS.map((position) => {
          const [x, y] = polar(R_SIGNATURE, angleOf(position));
          const classes = [
            "circle__signature",
            ...(camelot ? ["circle__signature--camelot"] : []),
            ...(position === selectedPosition ? ["is-selected"] : []),
            ...(camelot && compatiblePositions.has(position) ? ["is-compatible"] : []),
          ];
          return (
            <text
              key={position}
              className={classes.join(" ")}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {camelot
                ? `${camelotAt(position, "minor").label} ${camelotAt(position, "major").label}`
                : keysAt(position, "major")
                    .map((k) => signatureLabel(keySignature(k)))
                    .join(" / ")}
            </text>
          );
        })}

        <circle className="circle__center" r={hubRadius} />
      </g>

      {stepRing && <StepRing value={value} outer={hubRadius - 4} />}

      {showFall && (
        <g aria-hidden="true">
          <FifthsFall value={value} />
        </g>
      )}
    </svg>
  );
}
