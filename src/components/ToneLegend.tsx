interface ToneLegendProps {
  /** Label for the root of a chord or the tonic of a scale. */
  root?: string;
  /** Label for the other highlighted tones. */
  tone?: string;
}

/** Colour key shared by the piano and the guitar neck. */
export function ToneLegend({ root = "Root", tone = "Chord tone" }: ToneLegendProps) {
  return (
    <figcaption className="tone-legend">
      <span className="legend legend--root">{root}</span>
      <span className="legend legend--tone">{tone}</span>
    </figcaption>
  );
}
