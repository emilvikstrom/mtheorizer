interface ToneLegendProps {
  /** Label for the root of a chord or the tonic of a scale. */
  root?: string;
  /** Label for the other highlighted tones. */
  tone?: string;
  /** Show the key for the bass marker. */
  bass?: boolean;
}

/** Colour key shared by the piano and the guitar neck. */
export function ToneLegend({ root = "Root", tone = "Chord tone", bass = false }: ToneLegendProps) {
  return (
    <figcaption className="tone-legend">
      <span className="legend legend--root">{root}</span>
      <span className="legend legend--tone">{tone}</span>
      {bass && <span className="legend legend--bass">Bass</span>}
    </figcaption>
  );
}
