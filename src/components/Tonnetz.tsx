import { type KeyboardEvent, useState } from "react";
import { audioSupported, planPlayback, playNotes } from "../audio/playback";
import {
  type ChordQualityId,
  type LatticePoint,
  type Note,
  TRANSFORMATIONS,
  TRANSFORMATION_NAMES,
  type Transformation,
  type Triad,
  buildChord,
  chordOnKeyboard,
  formatNote,
  neighborPoint,
  noteAtPoint,
  tonnetzNeighbors,
  triadTones,
  triangleAt,
} from "../theory";
import { PlayButtons } from "./PlayButtons";

/** The part of the lattice that is drawn, around the selected triad's root at (0, 0). */
const I_RANGE = [-2, 2] as const;
const J_RANGE = [-2, 2] as const;

const S = 56;
const HEIGHT = S * Math.sqrt(3) * 0.5;
const xOf = ({ i, j }: LatticePoint) => i * S + (j * S) / 2;
const yOf = ({ j }: LatticePoint) => -j * HEIGHT;

const PAD = 22;
const VIEW = {
  x: xOf({ i: I_RANGE[0], j: J_RANGE[0] }) - PAD,
  y: yOf({ i: 0, j: J_RANGE[1] }) - PAD,
  width: xOf({ i: I_RANGE[1], j: J_RANGE[1] }) - xOf({ i: I_RANGE[0], j: J_RANGE[0] }) + 2 * PAD,
  height: yOf({ i: 0, j: J_RANGE[0] }) - yOf({ i: 0, j: J_RANGE[1] }) + 2 * PAD,
};

const inRange = ({ i, j }: LatticePoint) =>
  i >= I_RANGE[0] && i <= I_RANGE[1] && j >= J_RANGE[0] && j <= J_RANGE[1];

const triadName = (t: Triad) => `${formatNote(t.root)}${t.mode === "minor" ? "m" : ""}`;
const triadWords = (t: Triad) => `${formatNote(t.root)} ${t.mode}`;
const sameSpot = (a: LatticePoint, b: LatticePoint) => a.i === b.i && a.j === b.j;

interface Cell {
  readonly at: LatticePoint;
  readonly mode: Triad["mode"];
  readonly triad: Triad;
  /** Set for the three neighbours of the selected triad. */
  readonly by?: Transformation;
  readonly selected: boolean;
}

/** The triangles of the window, with the selected triad and its neighbours named by the theory. */
function cellsAround(triad: Triad): Cell[] {
  const neighbors = tonnetzNeighbors(triad);
  const here: LatticePoint = { i: 0, j: 0 };
  const cells: Cell[] = [];
  for (let i = I_RANGE[0]; i <= I_RANGE[1]; i++) {
    for (let j = J_RANGE[0]; j <= J_RANGE[1]; j++) {
      for (const mode of ["major", "minor"] as const) {
        const at = { i, j };
        if (!triangleAt(at, mode).every(inRange)) continue;
        const selected = mode === triad.mode && sameSpot(at, here);
        const by =
          mode === triad.mode
            ? undefined
            : TRANSFORMATIONS.find((t) => sameSpot(neighborPoint(here, triad.mode, t), at));
        cells.push({
          at,
          mode,
          selected,
          ...(by ? { by } : {}),
          triad: selected
            ? triad
            : by
              ? neighbors[by]
              : { root: noteAtPoint(triad.root, at), mode },
        });
      }
    }
  }
  return cells;
}

const centroid = (points: readonly LatticePoint[]): [number, number] => [
  points.reduce((sum, p) => sum + xOf(p), 0) / points.length,
  points.reduce((sum, p) => sum + yOf(p), 0) / points.length,
];

const polygon = (points: readonly LatticePoint[]) =>
  points.map((p) => `${xOf(p).toFixed(1)},${yOf(p).toFixed(1)}`).join(" ");

const keyName = (n: Note) => formatNote(n);

interface TonnetzProps {
  triad: Triad;
  onChange: (triad: Triad) => void;
  onOpenChord: (root: Note, quality: ChordQualityId) => void;
}

/**
 * The Tonnetz: notes on a lattice (a fifth to the right, a major third up and to the right) where
 * every triad is a triangle. The three triangles across its edges are the triad's P, L and R
 * neighbours; a click on one moves there.
 */
export function Tonnetz({ triad, onChange, onOpenChord }: TonnetzProps) {
  const [playOnMove, setPlayOnMove] = useState(false);
  const cells = cellsAround(triad);
  const neighbors = tonnetzNeighbors(triad);
  const tones = triadTones(triad);

  const midisOf = (t: Triad) =>
    chordOnKeyboard(buildChord(t.root, t.mode)).map((tone) => tone.midi);

  function moveTo(next: Triad) {
    onChange(next);
    if (playOnMove && audioSupported()) playNotes(planPlayback(midisOf(next), "together"));
  }

  const onKey = (event: KeyboardEvent, next: Triad) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    moveTo(next);
  };

  // The notes at the corners of the drawn triangles.
  const corners: LatticePoint[] = [];
  for (let i = I_RANGE[0]; i <= I_RANGE[1]; i++) {
    for (let j = J_RANGE[0]; j <= J_RANGE[1]; j++) corners.push({ i, j });
  }
  const chosen = triangleAt({ i: 0, j: 0 }, triad.mode);

  return (
    <section className="tonnetz" aria-labelledby="tonnetz-heading">
      <h2 className="tonnetz__heading" id="tonnetz-heading">
        Tonnetz
      </h2>
      <p className="tonnetz__text">
        Notes sit on a grid: a perfect fifth to the right, a major third up and to the right. Three
        notes next to each other form a triad, a triangle that points up for a major chord and down
        for a minor one. Each edge leads to a neighbour that changes one tone: <b>P</b> (parallel, C
        → Cm), <b>L</b> (leading tone, C → Em) and <b>R</b> (relative, C → Am).
      </p>

      <svg
        className="tonnetz__grid"
        viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.width} ${VIEW.height}`}
        role="group"
        aria-label={`Tonnetz around ${triadWords(triad)}`}
      >
        {cells.map((cell) => {
          const points = triangleAt(cell.at, cell.mode);
          const [cx, cy] = centroid(points);
          const className = [
            "tonnetz__triangle",
            `tonnetz__triangle--${cell.mode}`,
            cell.selected ? "tonnetz__triangle--selected" : "",
            cell.by ? "tonnetz__triangle--neighbor" : "",
          ]
            .filter(Boolean)
            .join(" ");
          const label = (
            <>
              <text
                className="tonnetz__chord"
                x={cx}
                y={cell.by ? cy - 2 : cy + 4}
                textAnchor="middle"
              >
                {triadName(cell.triad)}
              </text>
              {cell.by ? (
                <text className="tonnetz__move" x={cx} y={cy + 13} textAnchor="middle">
                  {cell.by}
                </text>
              ) : null}
            </>
          );
          return cell.by ? (
            <g
              key={`${cell.mode}-${cell.at.i}-${cell.at.j}`}
              className={className}
              role="button"
              tabIndex={0}
              aria-label={`${cell.by}, ${TRANSFORMATION_NAMES[cell.by].toLowerCase()}: ${triadWords(cell.triad)}`}
              onClick={() => moveTo(cell.triad)}
              onKeyDown={(event) => onKey(event, cell.triad)}
            >
              <polygon points={polygon(points)} />
              {label}
            </g>
          ) : (
            <g key={`${cell.mode}-${cell.at.i}-${cell.at.j}`} className={className}>
              <polygon points={polygon(points)} />
              {label}
            </g>
          );
        })}
        {corners.map((p) => {
          const inTriad = chosen.some((c) => sameSpot(c, p));
          return (
            <g
              key={`${p.i}-${p.j}`}
              className={inTriad ? "tonnetz__note tonnetz__note--in" : "tonnetz__note"}
            >
              <circle cx={xOf(p)} cy={yOf(p)} r={inTriad ? 4.5 : 3} />
              <text x={xOf(p)} y={yOf(p) - 7} textAnchor="middle">
                {keyName(noteAtPoint(triad.root, p))}
              </text>
            </g>
          );
        })}
      </svg>

      <p className="tonnetz__now" aria-live="polite">
        <b>{triadWords(triad)}</b>: {tones.map(keyName).join(" ")}
      </p>
      <ul className="tonnetz__moves">
        {TRANSFORMATIONS.map((by) => (
          <li key={by}>
            <b>{by}</b> {TRANSFORMATION_NAMES[by].toLowerCase()} → {triadWords(neighbors[by])}
          </li>
        ))}
      </ul>

      <div className="tonnetz__actions">
        <button
          type="button"
          className="tonnetz__open"
          onClick={() => onOpenChord(triad.root, triad.mode)}
        >
          Open {triadName(triad)} as a chord
        </button>
        {audioSupported() ? (
          <label className="tonnetz__toggle">
            <input
              type="checkbox"
              checked={playOnMove}
              onChange={(event) => setPlayOnMove(event.target.checked)}
            />{" "}
            Play each chord as you move
          </label>
        ) : null}
      </div>
      <PlayButtons midis={midisOf(triad)} kind="chord" name={triadWords(triad)} />
    </section>
  );
}
