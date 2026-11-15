import { type KeyboardEvent, useRef } from 'react';
import {
  type Key,
  type KeyMode,
  type KeySignature,
  circlePosition,
  formatKey,
  formatNote,
  keySignature,
  keysAt,
} from '../theory';

const R_CENTER = 100;
const R_SPLIT = 168;
const R_OUTER = 250;
const R_SIGNATURE = 274;

const POSITIONS = Array.from({ length: 12 }, (_, position) => position);
const MODES: readonly KeyMode[] = ['major', 'minor'];

/** Angle in degrees of the middle of `position`, with C at the top. */
const angleOf = (position: number) => -90 + position * 30;

function polar(radius: number, degrees: number): [number, number] {
  const radians = (degrees * Math.PI) / 180;
  return [radius * Math.cos(radians), radius * Math.sin(radians)];
}

const point = (radius: number, degrees: number) =>
  polar(radius, degrees)
    .map((v) => v.toFixed(2))
    .join(' ');

/** Ring segment between radii r1 < r2 and angles a0 < a1. */
function sectorPath(r1: number, r2: number, a0: number, a1: number): string {
  return [
    `M ${point(r2, a0)}`,
    `A ${r2} ${r2} 0 0 1 ${point(r2, a1)}`,
    `L ${point(r1, a1)}`,
    `A ${r1} ${r1} 0 0 0 ${point(r1, a0)}`,
    'Z',
  ].join(' ');
}

const shortName = (k: Key) => formatNote(k.tonic) + (k.mode === 'minor' ? 'm' : '');

export function signatureLabel(signature: KeySignature): string {
  const count = signature.accidentals.length;
  if (signature.kind === 'none') return '0';
  return `${count}${signature.kind === 'sharps' ? '♯' : '♭'}`;
}

const segmentId = (position: number, mode: KeyMode) => `${mode}-${position}`;

interface SegmentProps {
  position: number;
  mode: KeyMode;
  selected: boolean;
  nearby: boolean;
  onSelect: () => void;
  register: (el: SVGGElement | null) => void;
}

function Segment({ position, mode, selected, nearby, onSelect, register }: SegmentProps) {
  const keys = keysAt(position, mode);
  const [r1, r2] = mode === 'major' ? [R_SPLIT, R_OUTER] : [R_CENTER, R_SPLIT];
  const mid = angleOf(position);
  const [x, y] = polar((r1 + r2) / 2, mid);
  const [main, ...alternatives] = keys.map(shortName);
  const classes = ['circle__segment', `circle__segment--${mode}`, nearby && 'is-nearby', selected && 'is-selected']
    .filter(Boolean)
    .join(' ');

  return (
    <g
      ref={register}
      className={classes}
      role="radio"
      aria-checked={selected}
      aria-label={keys.map(formatKey).join(' / ')}
      tabIndex={selected ? 0 : -1}
      data-position={position}
      data-mode={mode}
      onClick={onSelect}
    >
      <path d={sectorPath(r1, r2, mid - 15, mid + 15)} />
      <text className="circle__label" x={x} y={y} textAnchor="middle" dominantBaseline="central">
        {alternatives.length === 0 ? (
          main
        ) : (
          <>
            <tspan x={x} dy="-0.45em">
              {main}
            </tspan>
            <tspan x={x} dy="1.15em" className="circle__alt">
              {alternatives.join(' ')}
            </tspan>
          </>
        )}
      </text>
    </g>
  );
}

interface CircleOfFifthsProps {
  value: Key;
  onChange: (key: Key) => void;
}

/**
 * The circle of fifths: major keys on the outer ring, their relative minors
 * on the inner ring and the key signature outside. The selected key and its
 * neighbours (the six diatonic major and minor chords) are highlighted.
 */
export function CircleOfFifths({ value, onChange }: CircleOfFifthsProps) {
  const segments = useRef(new Map<string, SVGGElement>());
  const selectedPosition = circlePosition(value);
  const isNearby = (position: number) => [11, 0, 1].includes((position - selectedPosition + 12) % 12);

  function select(position: number, mode: KeyMode, focus = false) {
    const [first] = keysAt(position, mode);
    if (!first) return;
    onChange(first);
    if (focus) segments.current.get(segmentId(position, mode))?.focus();
  }

  function onKeyDown(event: KeyboardEvent) {
    const moves: Record<string, [number, KeyMode]> = {
      ArrowRight: [selectedPosition + 1, value.mode],
      ArrowLeft: [selectedPosition + 11, value.mode],
      ArrowUp: [selectedPosition, 'major'],
      ArrowDown: [selectedPosition, 'minor'],
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      select(move[0] % 12, move[1], true);
    } else if (event.key === 'Enter' || event.key === ' ') {
      const target = (event.target as Element).closest<SVGGElement>('[data-position]');
      if (!target) return;
      event.preventDefault();
      select(Number(target.dataset.position), target.dataset.mode as KeyMode);
    }
  }

  const signature = keySignature(value);

  return (
    <svg
      className="circle"
      viewBox="-300 -300 600 600"
      role="radiogroup"
      aria-label="Circle of fifths. Arrow keys move around the circle and between major and minor."
      onKeyDown={onKeyDown}
    >
      {POSITIONS.flatMap((position) =>
        MODES.map((mode) => (
          <Segment
            key={segmentId(position, mode)}
            position={position}
            mode={mode}
            selected={position === selectedPosition && mode === value.mode}
            nearby={isNearby(position)}
            onSelect={() => select(position, mode)}
            register={(el) => {
              const id = segmentId(position, mode);
              if (el) segments.current.set(id, el);
              else segments.current.delete(id);
            }}
          />
        )),
      )}

      <g aria-hidden="true">
        {POSITIONS.map((position) => {
          const [x, y] = polar(R_SIGNATURE, angleOf(position));
          return (
            <text
              key={position}
              className={`circle__signature${position === selectedPosition ? ' is-selected' : ''}`}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {keysAt(position, 'major')
                .map((k) => signatureLabel(keySignature(k)))
                .join(' / ')}
            </text>
          );
        })}

        <circle className="circle__center" r={R_CENTER} />
        <text className="circle__center-name" y={-8} textAnchor="middle">
          {formatKey(value)}
        </text>
        <text className="circle__center-signature" y={22} textAnchor="middle">
          {signature.kind === 'none' ? 'no sharps or flats' : signatureLabel(signature)}
        </text>
      </g>
    </svg>
  );
}
