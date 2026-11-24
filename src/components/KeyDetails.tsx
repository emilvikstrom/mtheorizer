import { useState } from "react";
import {
  type ChordQualityId,
  type HarmonicFunction,
  type Key,
  type Note,
  borrowedChords,
  camelotCode,
  secondaryDominants,
  circlePosition,
  diatonicTriads,
  dominantKey,
  formatKey,
  formatNote,
  harmonicMinorDominant,
  keyEquals,
  keyScale,
  keySignature,
  keysAt,
  parallelKey,
  relativeKey,
  subdominantKey,
} from "../theory";
import { NegativeHarmony } from "./NegativeHarmony";
import { PivotChords } from "./PivotChords";
import { type TabItem, Tabs, panelId, tabId } from "./Tabs";

const FUNCTION_LABELS: Record<HarmonicFunction, string> = {
  tonic: "Tonic",
  subdominant: "Subdominant",
  dominant: "Dominant",
};

/** What the panel shows, one at a time: each is something you can find on the circle. */
export type KeyTopic = "chords" | "nearby" | "dominants" | "borrowed" | "mirror";

const TOPICS: readonly TabItem<KeyTopic>[] = [
  { id: "chords", label: "Chords in the key" },
  { id: "nearby", label: "Nearby keys" },
  { id: "dominants", label: "Secondary dominants" },
  { id: "borrowed", label: "Borrowed chords" },
  { id: "mirror", label: "Negative harmony" },
];

/** Tab ids of their own, so they never clash with the app's tabs. */
const topicId = (topic: KeyTopic) => `topic-${topic}`;

function signatureText(key: Key): string {
  const { kind, accidentals } = keySignature(key);
  if (kind === "none") return "No sharps or flats";
  const count = accidentals.length;
  const word = kind === "sharps" ? "sharp" : "flat";
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

const tonicOf = (k: Key) => formatNote(k.tonic);

/** One sentence on where `topic` is found on the circle for `value`. */
function onTheCircle(topic: KeyTopic, value: Key): string {
  const major = value.mode === "major";
  const sub = tonicOf(subdominantKey(value));
  const dom = tonicOf(dominantKey(value));
  const home = tonicOf(value);
  switch (topic) {
    case "chords":
      return major
        ? `The outlined block: ${sub}, ${home} and ${dom} (IV, I, V) side by side on the outer ring, their relative minors (ii, vi, iii) on the ring inside, and vii° on the innermost ring. Pick another key and the block turns with it.`
        : `The outlined block: ${sub}m, ${home}m and ${dom}m (iv, i, v) side by side on the minor ring, their relative majors (VI, III, VII) outside them, and ii° on the innermost ring. Pick another key and the block turns with it.`;
    case "nearby":
      return `${formatKey(dominantKey(value))} is one step clockwise, ${formatKey(subdominantKey(value))} one step counterclockwise, and ${formatKey(relativeKey(value))} shares ${home}'s sector. Neighbours differ by one note, so they are the easiest keys to move to. The parallel key, ${formatKey(parallelKey(value))}, is three steps away.`;
    case "dominants":
      return "Each secondary dominant sits one step clockwise of the chord it resolves to: its root is a fifth above. Turn on Falling fifths under the circle to see the steps counterclockwise.";
    case "borrowed":
      return major
        ? `${formatKey(parallelKey(value))} is three steps counterclockwise of ${home} major (three more flats). The borrowed chords come from its block.`
        : `${formatKey(parallelKey(value))} is three steps clockwise of ${home} minor (three more sharps). The borrowed chords come from its block.`;
    case "mirror":
      return `Negative harmony mirrors the circle: the mirror line runs between ${home} and ${dom}, so each note swaps with the one at the same distance on the other side (${home} ↔ ${dom}, ${sub} ↔ ${tonicOf(dominantKey(dominantKey(value)))}).`;
  }
}

interface KeyDetailsProps {
  value: Key;
  onChange: (key: Key) => void;
  /** Open a chord in the chord view. */
  onOpenChord: (root: Note, quality: ChordQualityId) => void;
}

/**
 * The selected key: its name and signature, then one topic at a time (its chords, nearby keys,
 * secondary dominants, borrowed chords, negative harmony), each with where to find it on the circle.
 */
export function KeyDetails({ value, onChange, onOpenChord }: KeyDetailsProps) {
  const [topic, setTopic] = useState<KeyTopic>("chords");
  const spellings = keysAt(circlePosition(value), value.mode);
  const { accidentals } = keySignature(value);

  return (
    <section className="key-details" aria-labelledby="key-name">
      <header className="key-details__header">
        <p className="key-details__eyebrow">
          {value.mode === "major" ? "Major key" : "Minor key (natural minor)"}
          <span className="key-details__camelot">
            {" · "}
            <abbr title="Camelot wheel code, as DJ software shows it">Camelot</abbr>{" "}
            {camelotCode(value).label}
          </span>
        </p>
        <h2 id="key-name" className="key-details__name" aria-live="polite">
          {formatKey(value)}
        </h2>
        {spellings.length > 1 && (
          <div className="key-details__spellings" role="group" aria-label="Spelling">
            {spellings.map((k) => (
              <button
                key={formatKey(k)}
                type="button"
                className="toggle"
                aria-pressed={keyEquals(k, value)}
                onClick={() => onChange(k)}
              >
                {formatKey(k)}
              </button>
            ))}
          </div>
        )}
        <div className="key-details__signature">
          <span className="key-details__text">{signatureText(value)}</span>
          {accidentals.length > 0 && (
            <ol className="pills" aria-label="Accidentals in the key signature">
              {accidentals.map((n) => (
                <li key={formatNote(n)} className="pill">
                  {formatNote(n)}
                </li>
              ))}
            </ol>
          )}
        </div>
      </header>

      <div className="key-details__topics">
        <Tabs
          label="About this key"
          tabs={TOPICS.map((t) => ({ ...t, id: topicId(t.id) }))}
          value={topicId(topic)}
          onChange={(id) => {
            const next = TOPICS.find((t) => topicId(t.id) === id);
            if (next) setTopic(next.id);
          }}
        />
      </div>

      <div
        className="key-details__panel"
        role="tabpanel"
        id={panelId(topicId(topic))}
        aria-labelledby={tabId(topicId(topic))}
      >
        <p className="key-details__circle">
          <span className="key-details__circle-label">On the circle: </span>
          {onTheCircle(topic, value)}
        </p>
        {topic === "chords" ? (
          <KeyChords value={value} onOpenChord={onOpenChord} />
        ) : topic === "nearby" ? (
          <NearbyKeys value={value} onChange={onChange} onOpenChord={onOpenChord} />
        ) : topic === "dominants" ? (
          <SecondaryDominants value={value} onOpenChord={onOpenChord} />
        ) : topic === "borrowed" ? (
          <BorrowedChords value={value} onOpenChord={onOpenChord} />
        ) : (
          <NegativeHarmony value={value} onOpenChord={onOpenChord} />
        )}
      </div>
    </section>
  );
}

interface TopicProps {
  value: Key;
  onOpenChord: (root: Note, quality: ChordQualityId) => void;
}

function KeyChords({ value, onOpenChord }: TopicProps) {
  const harmonicDominant = harmonicMinorDominant(value);
  return (
    <>
      <div className="key-details__section">
        <h3 className="key-details__heading">Scale</h3>
        <ol className="pills" aria-label="Notes in the scale">
          {keyScale(value).map((n, i) => (
            <li key={formatNote(n)} className={`pill${i === 0 ? " pill--tonic" : ""}`}>
              {formatNote(n)}
            </li>
          ))}
        </ol>
      </div>

      <div className="key-details__section">
        <h3 className="key-details__heading">Diatonic triads</h3>
        <p className="key-details__text">Click a chord to open it in Chords.</p>
        <ol className="triads" aria-label="Diatonic triads">
          {diatonicTriads(value).map((triad) => (
            <li key={triad.degree}>
              <button
                type="button"
                className={`triad triad--${triad.quality}`}
                aria-label={`Open ${triad.symbol} in Chords`}
                onClick={() => {
                  const root = triad.notes[0];
                  if (root) onOpenChord(root, triad.quality);
                }}
              >
                <span className="triad__roman">{triad.roman}</span>
                <span className="triad__symbol">{triad.symbol}</span>
                <span className="triad__function">
                  {triad.function && FUNCTION_LABELS[triad.function]}
                </span>
              </button>
            </li>
          ))}
        </ol>
        {harmonicDominant && (
          <p className="key-details__note">
            In harmonic minor the seventh is raised, so the dominant becomes major:{" "}
            <strong>{harmonicDominant.symbol}</strong> (V). It is drawn dashed on the circle.
          </p>
        )}
      </div>
    </>
  );
}

function NearbyKeys({
  value,
  onChange,
  onOpenChord,
}: TopicProps & { onChange: (key: Key) => void }) {
  const related: [string, Key][] = [
    [value.mode === "major" ? "Relative minor" : "Relative major", relativeKey(value)],
    ["Dominant", dominantKey(value)],
    ["Subdominant", subdominantKey(value)],
    [value.mode === "major" ? "Parallel minor" : "Parallel major", parallelKey(value)],
  ];
  return (
    <>
      <div className="key-details__section">
        <h3 className="key-details__heading">Related keys</h3>
        <div className="related">
          {related.map(([label, k]) => (
            <button key={label} type="button" className="related__key" onClick={() => onChange(k)}>
              <span className="related__label">{label}</span>
              <span className="related__name">{formatKey(k)}</span>
            </button>
          ))}
        </div>
      </div>
      <PivotChords value={value} onOpenChord={onOpenChord} />
    </>
  );
}

function SecondaryDominants({ value, onOpenChord }: TopicProps) {
  return (
    <div className="key-details__section">
      <h3 className="key-details__heading">Secondary dominants</h3>
      <p className="key-details__text">
        A dominant seventh aimed at another chord of the key, as D7 leads to G in C major. The notes
        outside {formatKey(value)} are marked with a dot. Click one to open it.
      </p>
      <ol className="triads" aria-label="Secondary dominants">
        {secondaryDominants(value).map((dominant) => (
          <li key={dominant.target}>
            <button
              type="button"
              className="triad triad--secondary"
              aria-label={`Open ${dominant.symbol} in Chords, ${dominant.roman}, resolves to ${dominant.targetSymbol}${
                dominant.foreign.length > 0
                  ? `, with ${dominant.foreign.map((n) => formatNote(n)).join(" and ")} from outside the key`
                  : ", all notes in the key"
              }`}
              onClick={() => {
                const root = dominant.notes[0];
                if (root) onOpenChord(root, "dominant7");
              }}
            >
              <span className="triad__roman">{dominant.roman}</span>
              <span className="triad__symbol">{dominant.symbol}</span>
              <span className="triad__function">→ {dominant.targetSymbol}</span>
              <span className="triad__foreign" aria-hidden="true">
                {dominant.foreign.length > 0
                  ? `● ${dominant.foreign.map((n) => formatNote(n)).join(" ")}`
                  : "in key"}
              </span>
            </button>
          </li>
        ))}
      </ol>
      <p className="key-details__note">
        For the diminished chords a half step below each chord, see Secondary leading-tone chords in
        Progressions.
      </p>
    </div>
  );
}

function BorrowedChords({ value, onOpenChord }: TopicProps) {
  const borrowed = borrowedChords(value);
  const origin = borrowed[0]?.origin;
  return (
    <div className="key-details__section">
      <h3 className="key-details__heading">Borrowed chords</h3>
      {borrowed.length === 0 ? (
        <p className="key-details__text">No borrowed chords are listed for {formatKey(value)}.</p>
      ) : (
        <>
          <p className="key-details__text">
            Chords from the parallel key{origin && `, ${formatKey(origin)}`}, that colour{" "}
            {formatKey(value)}. Click one to open it.
          </p>
          <ol className="triads" aria-label="Borrowed chords">
            {borrowed.map((chord) => (
              <li key={chord.degree}>
                <button
                  type="button"
                  className={`triad triad--borrowed triad--${chord.quality}`}
                  aria-label={`Open ${chord.symbol} in Chords, borrowed from ${formatKey(chord.origin)}`}
                  onClick={() => {
                    const root = chord.notes[0];
                    if (root) onOpenChord(root, chord.quality);
                  }}
                >
                  <span className="triad__roman">{chord.roman}</span>
                  <span className="triad__symbol">{chord.symbol}</span>
                  <span className="triad__function">{formatKey(chord.origin)}</span>
                </button>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
