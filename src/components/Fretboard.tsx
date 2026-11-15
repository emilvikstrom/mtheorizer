import { useState } from "react";
import {
  type HighlightTone,
  type NeckTone,
  type NeckView,
  type Tuning,
  formatNote,
  formatShape,
  lastFret,
} from "../theory";
import { ToneLegend } from "./ToneLegend";

const NAME_COLUMN = 24; // string names
const OPEN_COLUMN = 36; // open strings and muted-string marks, left of the nut
const FRET_WIDTH = 72;
const STRING_GAP = 30;
const BOARD_PADDING = 14; // board edge above the top string and below the bottom one
const DOT_RADIUS = 12;
const NUT_WIDTH = 5;

const NECK_START = NAME_COLUMN + OPEN_COLUMN;
const OPEN_X = NAME_COLUMN + OPEN_COLUMN / 2;
const STRING_COUNT = 6;
const BOARD_HEIGHT = (STRING_COUNT - 1) * STRING_GAP + 2 * BOARD_PADDING;
const FRET_NUMBER_Y = BOARD_HEIGHT + 18;
const HEIGHT = FRET_NUMBER_Y + 6;

const SINGLE_INLAYS = new Set([3, 5, 7, 9, 15]);
const DOUBLE_INLAY = 12;

const stringY = (string: number) => BOARD_PADDING + (string - 1) * STRING_GAP;
const midY = (a: number, b: number) => (stringY(a) + stringY(b)) / 2;

/** Nearest view to `fret`, so a new chord or scale opens where the hand already is. */
function nearestIndex(views: readonly NeckView[], fret: number): number {
  let best = 0;
  views.forEach((view, i) => {
    const bestView = views[best];
    if (bestView && Math.abs(view.firstFret - fret) < Math.abs(bestView.firstFret - fret)) best = i;
  });
  return best;
}

function whereOnNeck(view: NeckView): string {
  return view.positions.some((p) => p.fret === 0)
    ? "Open position"
    : `Frets ${view.firstFret}–${lastFret(view)}`;
}

function ToneDot({ position, x }: { position: NeckTone; x: number }) {
  const y = stringY(position.string);
  return (
    <g
      className={`fret-dot ${position.isRoot ? "fret-dot--root" : "fret-dot--tone"}`}
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

function NeckDiagram({
  view,
  description,
  tuning,
  left,
}: {
  view: NeckView;
  description: string;
  tuning: Tuning;
  left: boolean;
}) {
  const frets = Array.from({ length: view.frets }, (_, i) => view.firstFret + i);
  const neckEnd = NECK_START + view.frets * FRET_WIDTH;
  // A left-handed neck is the mirror image: the nut on the right, frets counting leftwards.
  const mx = (x: number) => (left ? neckEnd - x : x);
  const fretCentreX = (fret: number) =>
    mx(fret === 0 ? OPEN_X : NECK_START + (fret - view.firstFret + 0.5) * FRET_WIDTH);
  const muted = new Set(view.muted);

  return (
    <svg
      className="fretboard__svg"
      role="img"
      aria-label={description}
      viewBox={`0 0 ${neckEnd + 4} ${HEIGHT}`}
    >
      <title>{description}</title>
      <rect
        className="fretboard__board"
        x={left ? 0 : NECK_START}
        y={0}
        width={neckEnd - NECK_START}
        height={BOARD_HEIGHT}
      />

      {frets
        .filter((f) => SINGLE_INLAYS.has(f))
        .map((fret) => (
          <circle
            key={fret}
            className="fretboard__inlay"
            cx={fretCentreX(fret)}
            cy={midY(3, 4)}
            r={6}
          />
        ))}
      {frets.includes(DOUBLE_INLAY) && (
        <>
          <circle
            className="fretboard__inlay"
            cx={fretCentreX(DOUBLE_INLAY)}
            cy={midY(2, 3)}
            r={6}
          />
          <circle
            className="fretboard__inlay"
            cx={fretCentreX(DOUBLE_INLAY)}
            cy={midY(4, 5)}
            r={6}
          />
        </>
      )}

      {frets.map((fret, i) => {
        const x = mx(NECK_START + (i + 1) * FRET_WIDTH);
        return (
          <line key={fret} className="fretboard__fret" x1={x} y1={0} x2={x} y2={BOARD_HEIGHT} />
        );
      })}
      {view.firstFret === 1 ? (
        <rect
          className="fretboard__nut"
          x={mx(NECK_START) - NUT_WIDTH / 2}
          y={0}
          width={NUT_WIDTH}
          height={BOARD_HEIGHT}
        />
      ) : (
        <line
          className="fretboard__fret"
          x1={mx(NECK_START)}
          y1={0}
          x2={mx(NECK_START)}
          y2={BOARD_HEIGHT}
        />
      )}

      {tuning.strings.map((open, index) => {
        const string = index + 1;
        const y = stringY(string);
        return (
          <g key={string}>
            <line
              className="fretboard__string"
              x1={mx(NECK_START)}
              y1={y}
              x2={mx(neckEnd)}
              y2={y}
              // Lower strings are thicker.
              strokeWidth={1 + index * 0.35}
            />
            <text
              className="fretboard__string-name"
              x={mx(NAME_COLUMN / 2)}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {formatNote(open.note)}
            </text>
            {muted.has(string) && (
              <text
                className="fretboard__muted"
                data-muted={string}
                x={OPEN_X}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
              >
                ×
              </text>
            )}
          </g>
        );
      })}

      {frets.map((fret) => (
        <text
          key={fret}
          className="fretboard__fret-number"
          x={fretCentreX(fret)}
          y={FRET_NUMBER_Y}
          textAnchor="middle"
        >
          {fret}
        </text>
      ))}

      {view.positions.map((position) => (
        <ToneDot
          key={`${position.string}-${position.fret}`}
          position={position}
          x={fretCentreX(position.fret)}
        />
      ))}
    </svg>
  );
}

interface FretboardProps {
  /** The stretches of the neck to step through, lowest first. */
  views: readonly NeckView[];
  /** Chord shapes are described fret by fret; scale positions by their notes. */
  kind: "shape" | "position";
  /** The tones shown, each once, for the description. */
  tones: readonly HighlightTone[];
  /** What is shown, e.g. "C major" or "C major scale". */
  name: string;
  /** Legend for the marked positions: root/tonic, and the others. */
  legend: { root: string; tone: string };
  tuning: Tuning;
  /** Mirror the neck for a left-handed player. */
  left: boolean;
}

/** A few frets of a guitar neck at a time, with arrows to step along it. */
export function Fretboard({ views, kind, tones, name, legend, tuning, left }: FretboardProps) {
  // Remember where on the neck the player is rather than an index, so changing
  // the chord keeps the hand in the same area.
  const [wantedFret, setWantedFret] = useState(1);
  const index = nearestIndex(views, wantedFret);
  const view = views[index];
  const noun = kind === "shape" ? "Shape" : "Position";

  if (!view) {
    return <p className="fretboard__empty">No playable {noun.toLowerCase()} found.</p>;
  }

  const where = whereOnNeck(view);
  const status = `${noun} ${index + 1} of ${views.length}`;
  const detail =
    kind === "shape"
      ? formatShape(view, tuning.strings.length)
      : tones.map((tone) => formatNote(tone.note)).join(", ");
  const description = `${left ? "Left-handed guitar" : "Guitar"} neck showing ${name}${tuning.id === "standard" ? "" : ` in ${tuning.label} tuning`}, ${status.toLowerCase()}, ${where.toLowerCase()}: ${detail}`;
  const step = (delta: number) => {
    const next = views[index + delta];
    if (next) setWantedFret(next.firstFret);
  };

  return (
    <figure className="fretboard">
      <div className="fretboard__nav">
        <button
          type="button"
          className="fretboard__arrow"
          aria-label={`Previous ${noun.toLowerCase()}`}
          disabled={index === 0}
          onClick={() => step(-1)}
        >
          ←
        </button>
        <p className="fretboard__status" aria-live="polite">
          <span className="fretboard__status-count">{status}</span>
          <span className="fretboard__status-where">{where}</span>
        </p>
        <button
          type="button"
          className="fretboard__arrow"
          aria-label={`Next ${noun.toLowerCase()}`}
          disabled={index === views.length - 1}
          onClick={() => step(1)}
        >
          →
        </button>
      </div>
      <NeckDiagram view={view} description={description} tuning={tuning} left={left} />
      <ToneLegend {...legend} />
    </figure>
  );
}
