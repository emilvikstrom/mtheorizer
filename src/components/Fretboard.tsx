import { useState } from "react";
import {
  STRING_INSTRUMENTS,
  type HighlightTone,
  type NeckTone,
  type NeckView,
  type Tuning,
  formatFingering,
  formatNote,
  formatShape,
  lastFret,
  omittedTones,
} from "../theory";
import { type ToneDisplay, toneLabel } from "../toneLabels";
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
const boardHeight = (strings: number) => (strings - 1) * STRING_GAP + 2 * BOARD_PADDING;

const SINGLE_INLAYS = new Set([3, 5, 7, 9, 15]);
const DOUBLE_INLAY = 12;

const stringY = (string: number) => BOARD_PADDING + (string - 1) * STRING_GAP;
/** A height on the board as a share of the way from the first string to the last. */
const shareY = (strings: number, share: number) =>
  BOARD_PADDING + (strings - 1) * STRING_GAP * share;

/** Where the player is on the neck: a fret, and which of the views starting there. */
interface Wanted {
  readonly fret: number;
  /** Tells apart views with the same first fret (variants of one grip). */
  readonly key: string;
}

const viewKey = (view: NeckView) => formatShape(view);

/**
 * Nearest view to the wanted fret, so a new chord or scale opens where the hand
 * already is. Among views at the same distance the one with the wanted key wins.
 */
function nearestIndex(views: readonly NeckView[], wanted: Wanted): number {
  let best = 0;
  views.forEach((view, i) => {
    const bestView = views[best];
    if (!bestView) return;
    const distance = Math.abs(view.firstFret - wanted.fret);
    const bestDistance = Math.abs(bestView.firstFret - wanted.fret);
    if (
      distance < bestDistance ||
      (distance === bestDistance &&
        viewKey(view) === wanted.key &&
        viewKey(bestView) !== wanted.key)
    ) {
      best = i;
    }
  });
  return best;
}

function whereOnNeck(view: NeckView): string {
  return view.positions.some((p) => p.fret === 0)
    ? "Open position"
    : `Frets ${view.firstFret}–${lastFret(view)}`;
}

function ToneDot({
  position,
  x,
  finger,
  display,
  sounding,
  shared,
}: {
  position: NeckTone;
  x: number;
  finger?: number;
  display: ToneDisplay;
  /** The tone sounds now: a dashed ring around the dot, besides the colour. */
  sounding: boolean;
  /** A common tone of two compared chords: a small mark on the dot, besides the colour. */
  shared: boolean;
}) {
  const y = stringY(position.string);
  const label = toneLabel(display, position);
  return (
    <>
      <g
        className={`fret-dot ${position.isRoot ? "fret-dot--root" : "fret-dot--tone"}`}
        data-highlighted="true"
        data-string={position.string}
        data-fret={position.fret}
        data-role={position.role}
        data-sounding={sounding ? "true" : undefined}
        data-shared={shared ? "true" : undefined}
      >
        {sounding && <circle className="fret-dot__sounding" cx={x} cy={y} r={DOT_RADIUS + 5} />}
        <circle cx={x} cy={y} r={DOT_RADIUS} />
        <text
          className="fret-dot__label"
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="central"
        >
          {label}
        </text>
        {shared && (
          <circle
            className="fret-dot__shared"
            cx={x + DOT_RADIUS - 2}
            cy={y - DOT_RADIUS + 2}
            r={4}
          />
        )}
      </g>
      {finger !== undefined && (
        <g className="fret-dot__finger" aria-hidden="true" data-finger={finger}>
          <circle cx={x + DOT_RADIUS - 2} cy={y + DOT_RADIUS - 2} r={7} />
          <text
            x={x + DOT_RADIUS - 2}
            y={y + DOT_RADIUS - 2}
            textAnchor="middle"
            dominantBaseline="central"
          >
            {finger}
          </text>
        </g>
      )}
    </>
  );
}

function NeckDiagram({
  view,
  description,
  tuning,
  left,
  display,
  sounding,
  shared,
}: {
  view: NeckView;
  description: string;
  tuning: Tuning;
  left: boolean;
  display: ToneDisplay;
  sounding?: ReadonlySet<number>;
  shared?: ReadonlySet<number>;
}) {
  // The notes sounding come from the keyboard's voicing, so they match a dot by its pitch class.
  const soundingClasses = new Set([...(sounding ?? [])].map((midi) => midi % 12));
  const frets = Array.from({ length: view.frets }, (_, i) => view.firstFret + i);
  const neckEnd = NECK_START + view.frets * FRET_WIDTH;
  // A left-handed neck is the mirror image: the nut on the right, frets counting leftwards.
  const mx = (x: number) => (left ? neckEnd - x : x);
  const fretCentreX = (fret: number) =>
    mx(fret === 0 ? OPEN_X : NECK_START + (fret - view.firstFret + 0.5) * FRET_WIDTH);
  const muted = new Set(view.muted);
  const strings = tuning.strings.length;
  const BOARD_HEIGHT = boardHeight(strings);
  const FRET_NUMBER_Y = BOARD_HEIGHT + 18;
  const HEIGHT = FRET_NUMBER_Y + 6;

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
            cy={shareY(strings, 0.5)}
            r={6}
          />
        ))}
      {frets.includes(DOUBLE_INLAY) && (
        <>
          <circle
            className="fretboard__inlay"
            cx={fretCentreX(DOUBLE_INLAY)}
            cy={shareY(strings, 0.3)}
            r={6}
          />
          <circle
            className="fretboard__inlay"
            cx={fretCentreX(DOUBLE_INLAY)}
            cy={shareY(strings, 0.7)}
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
                x={mx(OPEN_X)}
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

      {view.fingering?.barre && (
        <rect
          className="fretboard__barre"
          data-barre-fret={view.fingering.barre.fret}
          x={fretCentreX(view.fingering.barre.fret) - DOT_RADIUS}
          y={stringY(view.fingering.barre.toString) - DOT_RADIUS}
          width={2 * DOT_RADIUS}
          height={
            stringY(view.fingering.barre.fromString) -
            stringY(view.fingering.barre.toString) +
            2 * DOT_RADIUS
          }
          rx={DOT_RADIUS}
        />
      )}

      {view.positions.map((position) => (
        <ToneDot
          display={display}
          sounding={soundingClasses.has(position.midi % 12)}
          shared={shared?.has(position.midi % 12) === true}
          key={`${position.string}-${position.fret}`}
          position={position}
          finger={view.fingering?.fingerOn.get(position.string)}
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
  /** What the marked positions say: names (the default), intervals, steps, or nothing. */
  display?: ToneDisplay;
  /** MIDI numbers that sound right now (see `useSounding`): the marked positions with these pitch classes are ringed. */
  sounding?: ReadonlySet<number>;
  /** Pitch classes (0–11) shared with another chord: the positions with these get a mark. */
  shared?: ReadonlySet<number>;
}

/** A few frets of a guitar neck at a time, with arrows to step along it. */
export function Fretboard({
  views,
  kind,
  tones,
  name,
  legend,
  tuning,
  left,
  display = "names",
  sounding,
  shared,
}: FretboardProps) {
  // Remember where on the neck the player is rather than an index, so changing
  // the chord keeps the hand in the same area.
  const [wanted, setWanted] = useState<Wanted>({ fret: 1, key: "" });
  const index = nearestIndex(views, wanted);
  const view = views[index];
  const noun = kind === "shape" ? "Shape" : "Position";

  if (!view) {
    return (
      <p className="fretboard__empty" role="status">
        {kind === "shape" ? "No playable shape in this position" : "No playable position found"}
      </p>
    );
  }

  const where = whereOnNeck(view);
  const status = `${noun} ${index + 1} of ${views.length}`;
  const detail =
    kind === "shape"
      ? formatShape(view, tuning.strings.length)
      : display === "none"
        ? "tone labels hidden"
        : tones.map((tone) => formatNote(tone.note)).join(", ");
  const omitted = kind === "shape" ? omittedTones(view, tones) : [];
  const without = omitted.length
    ? `Without ${omitted
        .map((t) => (display === "none" ? t.role : `${t.role} (${formatNote(t.note)})`))
        .join(", ")}`
    : "";
  const fingers = view.fingering ? `, fingers ${formatFingering(view, tuning.strings.length)}` : "";
  const instrument = STRING_INSTRUMENTS[tuning.instrument].label;
  const inTuning =
    tuning.instrument === "guitar" && tuning.id !== "standard" ? ` in ${tuning.label} tuning` : "";
  const description = `${left ? `Left-handed ${instrument.toLowerCase()}` : instrument} neck showing ${name}${inTuning}, ${status.toLowerCase()}, ${where.toLowerCase()}: ${detail}${fingers}${without ? `. ${without}` : ""}`;
  const step = (delta: number) => {
    const next = views[index + delta];
    if (next) setWanted({ fret: next.firstFret, key: viewKey(next) });
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
      <NeckDiagram
        view={view}
        description={description}
        tuning={tuning}
        left={left}
        display={display}
        sounding={sounding}
        shared={shared}
      />
      {without && <p className="fretboard__omitted">{without}</p>}
      <ToneLegend {...legend} shared={shared !== undefined && shared.size > 0} />
    </figure>
  );
}
