import { type Chord, formatNote, toneLabel } from '../theory';

interface ChordInfoProps {
  chord: Chord;
}

export function ChordInfo({ chord }: ChordInfoProps) {
  return (
    <section className="chord-info" aria-labelledby="chord-name">
      <h2 id="chord-name" className="chord-info__name" aria-live="polite">
        {chord.name} <span className="chord-info__symbol">{chord.symbol}</span>
      </h2>
      <ol className="chord-info__tones" aria-label="Notes in the chord">
        {chord.tones.map((tone) => (
          <li key={tone.role} className={`tone tone--${tone.role}${tone.optional ? ' tone--optional' : ''}`}>
            <span className="tone__note">{formatNote(tone.note)}</span>
            <span className="tone__label">{toneLabel(tone)}</span>
            {tone.interval.semitones > 0 && (
              <span className="tone__semitones">{tone.interval.semitones} semitones above root</span>
            )}
            {tone.optional && <span className="tone__optional">Often left out</span>}
          </li>
        ))}
      </ol>
    </section>
  );
}
