import { type KeyboardEvent, useRef } from "react";
import {
  type Key,
  type KeyMode,
  type KeySignature,
  circlePosition,
  formatKey,
  formatNote,
  keySignature,
  keysAt,
  ringChords,
} from "../theory";

/** How many rings to draw: major only, plus minor, plus diminished. */
export type RingCount = 1 | 2 | 3;

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

interface SegmentProps {
  position: number;
  mode: KeyMode;
  radii: Radii;
  selected: boolean;
  nearby: boolean;
  onSelect: () => void;
  register: (el: SVGGElement | null) => void;
}

function Segment({ position, mode, radii, selected, nearby, onSelect, register }: SegmentProps) {
  const keys = keysAt(position, mode);
  const [r1, r2] = radii;
  const mid = angleOf(position);
  const [x, y] = polar((r1 + r2) / 2, mid);
  const classes = [
    "circle__segment",
    `circle__segment--${mode}`,
    nearby && "is-nearby",
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
      <SegmentLabel names={keys.map(shortName)} x={x} y={y} />
    </g>
  );
}

interface DiminishedSegmentProps {
  position: number;
  radii: Radii;
  selected: boolean;
  onSelect: () => void;
}

/**
 * The diminished chord at `position` (vii° of the major key, ii° of its
 * relative minor). It is a chord, not a key, so it is not part of the radio
 * group: a click anywhere in the sector selects the position and keeps the
 * current mode, and the keyboard uses the major and minor segments.
 */
function DiminishedSegment({ position, radii, selected, onSelect }: DiminishedSegmentProps) {
  const [r1, r2] = radii;
  const mid = angleOf(position);
  const [x, y] = polar((r1 + r2) / 2, mid);
  return (
    <g
      className={`circle__segment circle__segment--diminished${selected ? " is-selected" : ""}`}
      aria-hidden="true"
      data-position={position}
      data-ring="diminished"
      onClick={onSelect}
    >
      <path d={sectorPath(r1, r2, mid - 15, mid + 15)} />
      <SegmentLabel names={ringChords(position).diminished.map((c) => c.symbol)} x={x} y={y} />
    </g>
  );
}

interface CircleOfFifthsProps {
  value: Key;
  onChange: (key: Key) => void;
  rings?: RingCount;
}

/**
 * The circle of fifths: major keys on the outer ring, their relative minors
 * inside it, the diminished chords innermost and the key signature outside.
 * The selected key and its neighbours (the six diatonic major and minor
 * chords) are highlighted. The key's name and signature are shown by the
 * panel next to the circle, so the hub is left empty.
 */
export function CircleOfFifths({ value, onChange, rings = 3 }: CircleOfFifthsProps) {
  const segments = useRef(new Map<string, SVGGElement>());
  const radii = RING_RADII[rings];
  const diminishedRadii = radii.diminished;
  const selectedPosition = circlePosition(value);
  // Without the minor ring a minor key is shown by its relative major.
  const shownMode: KeyMode = radii.minor ? value.mode : "major";
  const hubRadius = Math.min(...Object.values(radii).map(([inner]) => inner));
  const isNearby = (position: number) =>
    [11, 0, 1].includes((position - selectedPosition + 12) % 12);

  function select(position: number, mode: KeyMode, focus = false) {
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
      className="circle"
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
              nearby={isNearby(position)}
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
            onSelect={() => select(position, shownMode)}
          />
        ))}

      <g aria-hidden="true">
        {POSITIONS.map((position) => {
          const [x, y] = polar(R_SIGNATURE, angleOf(position));
          return (
            <text
              key={position}
              className={`circle__signature${position === selectedPosition ? " is-selected" : ""}`}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {keysAt(position, "major")
                .map((k) => signatureLabel(keySignature(k)))
                .join(" / ")}
            </text>
          );
        })}

        <circle className="circle__center" r={hubRadius} />
      </g>
    </svg>
  );
}
