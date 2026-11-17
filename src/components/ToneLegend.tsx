interface ToneLegendProps {
  /** Label for the root of a chord or the tonic of a scale. An empty label leaves it out. */
  root?: string;
  /** Label for the other highlighted tones. */
  tone?: string;
  /** Show the key for the bass marker. */
  bass?: boolean;
  /** Show the key for a common tone of two compared chords. */
  shared?: boolean;
}

/** Colour key shared by the piano and the guitar neck. */
export function ToneLegend({
  root = "Root",
  tone = "Chord tone",
  bass = false,
  shared = false,
}: ToneLegendProps) {
  return (
    <figcaption className="tone-legend">
      {root !== "" && <span className="legend legend--root">{root}</span>}
      <span className="legend legend--tone">{tone}</span>
      {shared && <span className="legend legend--shared">Common tone</span>}
      {bass && <span className="legend legend--bass">Bass</span>}
    </figcaption>
  );
}
