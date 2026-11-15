import { type SpelledScale, formatNote, scaleToneLabel } from '../theory';

interface ScaleInfoProps {
  scale: SpelledScale;
}

export function ScaleInfo({ scale }: ScaleInfoProps) {
  return (
    <section className="chord-info" aria-labelledby="scale-name">
      <h2 id="scale-name" className="chord-info__name" aria-live="polite">
        {scale.name}
      </h2>
      <ol className="chord-info__tones chord-info__tones--scale" aria-label="Notes in the scale">
        {scale.tones.map((tone) => (
          <li key={tone.degree} className={`tone${tone.degree === 1 ? ' tone--root' : ''}`}>
            <span className="tone__degree">Degree {tone.degree}</span>
            <span className="tone__note">{formatNote(tone.note)}</span>
            <span className="tone__label">{scaleToneLabel(tone)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
