import {
  type VoiceLeading,
  type VoicedTone,
  describeVoiceLeading,
  formatNote,
  voiceLinks,
} from "../theory";
import {
  BLACK_HEIGHT,
  BLACK_WIDTH,
  type KeyShape,
  WHITE_HEIGHT,
  WHITE_WIDTH,
  keyboard,
  octaveOf,
  visibleSpan,
} from "./Piano";

/** Space between the two keyboards, where the lines run. */
const GAP = 90;

interface VoiceLeadingPianoProps {
  leading: VoiceLeading;
  /** The two chords, e.g. "C" and "Am", for the description. */
  names: readonly [string, string];
}

/** Where a key's line starts and ends: the middle of the key. */
const centre = (shape: KeyShape) => shape.x + (shape.black ? BLACK_WIDTH : WHITE_WIDTH) / 2;

/** The lower end of a key, where a line from it starts. */
const lowerEnd = (shape: KeyShape) => (shape.black ? BLACK_HEIGHT : WHITE_HEIGHT);

/**
 * Two keyboards, one over the other: the first chord on top, the second below,
 * with a line from every tone to where it goes. A tone that stays has a
 * straight line with a bar across it, a tone that moves has a slanted line with
 * an arrowhead and its distance in semitones, and a tone that drops out or
 * joins has a dashed stub with a minus or a plus. The meaning never rests on
 * colour alone.
 */
export function VoiceLeadingPiano({ leading, names }: VoiceLeadingPianoProps) {
  const all = [...leading.from, ...leading.to];
  const midis = all.map((t) => t.midi);
  const keys = keyboard(Math.min(...midis.map(octaveOf)), Math.max(...midis.map(octaveOf)));
  const span = visibleSpan(keys, all);
  const shapeOf = new Map(keys.map((k) => [k.midi, k]));
  const links = voiceLinks(leading);
  const bottomY = WHITE_HEIGHT + GAP;
  const description = `Voice leading from ${names[0]} to ${names[1]}: ${describeVoiceLeading(leading)}`;

  const row = (y: number, tones: readonly VoicedTone[], which: "from" | "to") => {
    const toneAt = new Map(tones.map((t) => [t.midi, t]));
    const draw = (shape: KeyShape) => {
      const tone = toneAt.get(shape.midi);
      const width = shape.black ? BLACK_WIDTH : WHITE_WIDTH;
      const height = shape.black ? BLACK_HEIGHT : WHITE_HEIGHT;
      const classes = [
        "key",
        shape.black ? "key--black" : "key--white",
        tone && (tone.role === "root" ? "key--root" : "key--tone"),
      ]
        .filter(Boolean)
        .join(" ");
      return (
        <g
          key={`${which}-${shape.midi}`}
          className={classes}
          data-midi={shape.midi}
          data-highlighted={tone ? "true" : undefined}
        >
          <rect x={shape.x} y={y} width={width} height={height} rx={shape.black ? 3 : 4} />
          {tone && (
            <text
              className="key__label"
              x={shape.x + width / 2}
              y={y + height - (shape.black ? 12 : 16)}
              textAnchor="middle"
            >
              {formatNote(tone.note)}
            </text>
          )}
        </g>
      );
    };
    return (
      <g data-row={which}>
        {keys.filter((k) => !k.black).map(draw)}
        {keys.filter((k) => k.black).map(draw)}
      </g>
    );
  };

  return (
    <figure className="voice-piano">
      <svg
        className="piano__svg"
        role="img"
        aria-label={description}
        viewBox={`${span.x - 1} -1 ${span.width + 2} ${bottomY + WHITE_HEIGHT + 2}`}
      >
        <title>{description}</title>
        <defs>
          <marker
            id="voice-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto"
          >
            <path className="voice-link__arrowhead" d="M0 0 L10 5 L0 10 z" />
          </marker>
        </defs>
        {row(0, leading.from, "from")}
        {row(bottomY, leading.to, "to")}
        {links.map((link, i) => {
          const a = link.from && shapeOf.get(link.from.midi);
          const b = link.to && shapeOf.get(link.to.midi);
          const key = `${link.kind}-${link.from?.midi ?? "x"}-${link.to?.midi ?? "x"}-${i}`;
          if (a && b) {
            const x1 = centre(a);
            const y1 = lowerEnd(a);
            const x2 = centre(b);
            const mx = (x1 + x2) / 2;
            const my = (y1 + bottomY) / 2;
            return (
              <g key={key} className={`voice-link voice-link--${link.kind}`} data-kind={link.kind}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={bottomY}
                  markerEnd={link.kind === "stay" ? undefined : "url(#voice-arrow)"}
                />
                {link.kind === "stay" && (
                  <line className="voice-link__bar" x1={mx - 7} y1={my} x2={mx + 7} y2={my} />
                )}
                <text className="voice-link__label" x={mx + 9} y={my + 4}>
                  {link.label}
                </text>
              </g>
            );
          }
          if (a) {
            const x = centre(a);
            const y = lowerEnd(a);
            return (
              <g key={key} className="voice-link voice-link--dropped" data-kind="dropped">
                <line x1={x} y1={y} x2={x} y2={y + 28} />
                <text className="voice-link__sign" x={x} y={y + 46} textAnchor="middle">
                  −
                </text>
                <text className="voice-link__label" x={x + 9} y={y + 24}>
                  {link.label}
                </text>
              </g>
            );
          }
          if (b) {
            const x = centre(b);
            return (
              <g key={key} className="voice-link voice-link--added" data-kind="added">
                <line x1={x} y1={bottomY - 28} x2={x} y2={bottomY} />
                <text className="voice-link__sign" x={x} y={bottomY - 34} textAnchor="middle">
                  +
                </text>
                <text className="voice-link__label" x={x + 9} y={bottomY - 14}>
                  {link.label}
                </text>
              </g>
            );
          }
          return null;
        })}
      </svg>
      <figcaption className="tone-legend voice-piano__legend">
        <span>
          Top: {names[0]} · Bottom: {names[1]}
        </span>
        <span>Bar: stays</span>
        <span>Arrow: moves (semitones)</span>
        <span>Dashed − / +: dropped / added</span>
      </figcaption>
    </figure>
  );
}
