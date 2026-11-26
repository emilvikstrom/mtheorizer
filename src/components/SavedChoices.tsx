import { useEffect, useState } from "react";
import {
  FAVORITES_KEY,
  RECENT_KEY,
  type SavedRoute,
  addRecent,
  hashOf,
  loadList,
  routeOf,
  saveList,
  toggleFavorite,
} from "../saved";
import {
  SCALES,
  STRING_INSTRUMENTS,
  builderChords,
  chordFromSpec,
  formatNote,
  formatTonality,
  inversionSymbol,
} from "../theory";

/** Short name of a stored choice: "Cm7", "C/E", "A Natural minor", "I–♭VI–V7/V–V in C major". */
function labelOf(route: SavedRoute): string {
  if (route.page === "build") {
    const steps = builderChords(route.tonality, route.steps).map(({ step }) => step.roman);
    return `${steps.join("–")} in ${formatTonality(route.tonality)}`;
  }
  if (route.page === "scale") return `${formatNote(route.root)} ${SCALES[route.scaleId].name}`;
  return inversionSymbol(chordFromSpec(route.root, route.spec), route.inversion);
}

/** The instrument a chord or scale is shown on; a progression has none. */
const instrumentOf = (route: SavedRoute): string | undefined =>
  route.page === "build"
    ? undefined
    : route.instrument === "piano"
      ? "Piano"
      : STRING_INSTRUMENTS[route.instrument].label;

interface Props {
  /**
   * The choice on screen. A chord or scale is added to the recent list. A progression is not,
   * since every chord added or moved would be a new entry, but it can be saved as a favourite.
   */
  readonly route: SavedRoute;
  /** Restores a whole saved choice. */
  readonly onOpen: (route: SavedRoute) => void;
}

/** Recent choices and pinned favourites, kept in localStorage. One click restores the whole choice. */
export function SavedChoices({ route, onOpen }: Props) {
  const [recent, setRecent] = useState(() => loadList(RECENT_KEY));
  const [favorites, setFavorites] = useState(() => loadList(FAVORITES_KEY));
  const current = hashOf(route);

  const progression = route.page === "build";
  // The chord or scale on screen joins the recent list as soon as it changes (adjusted while rendering).
  const [seen, setSeen] = useState<string>();
  if (!progression && seen !== current) {
    setSeen(current);
    setRecent(addRecent(recent, current));
  }

  useEffect(() => saveList(RECENT_KEY, recent), [recent]);
  useEffect(() => saveList(FAVORITES_KEY, favorites), [favorites]);

  const toggle = (hash: string) => setFavorites(toggleFavorite(favorites, hash));
  const clearRecent = () => setRecent([]);
  const clearFavorites = () => setFavorites([]);

  const chip = (hash: string) => {
    const saved = routeOf(hash);
    const label = labelOf(saved);
    const instrument = instrumentOf(saved);
    const named = instrument ? `${label} (${instrument})` : label;
    const isFavorite = favorites.includes(hash);
    return (
      <li key={hash} className="saved__item">
        <button
          type="button"
          className="saved__open"
          aria-current={hash === current ? "true" : undefined}
          aria-label={`Open ${named}`}
          onClick={() => onOpen(saved)}
        >
          <span className="saved__label">{label}</span>
          {instrument && instrument !== "Piano" ? (
            <span className="saved__meta">{instrument}</span>
          ) : null}
        </button>
        <button
          type="button"
          className="saved__pin"
          aria-pressed={isFavorite}
          aria-label={`Favorite ${named}`}
          onClick={() => toggle(hash)}
        >
          {isFavorite ? "★" : "☆"}
        </button>
      </li>
    );
  };

  const canSave = progression && route.steps.length > 0;
  if (recent.length === 0 && favorites.length === 0 && !canSave) return null;

  return (
    <section className="saved" aria-label="Recent and favorite choices">
      {canSave ? (
        <div className="saved__group">
          <button
            type="button"
            className="saved__clear"
            aria-pressed={favorites.includes(current)}
            onClick={() => toggle(current)}
          >
            {favorites.includes(current) ? "★ Saved as a favorite" : "☆ Save this progression"}
          </button>
        </div>
      ) : null}
      {favorites.length > 0 ? (
        <div className="saved__group">
          <p className="saved__heading" aria-hidden="true">
            Favorites
          </p>
          <ul className="saved__list" aria-label="Favorites">
            {favorites.map(chip)}
          </ul>
          <button type="button" className="saved__clear" onClick={clearFavorites}>
            Clear favorites
          </button>
        </div>
      ) : null}
      {recent.length > 0 ? (
        <div className="saved__group">
          <p className="saved__heading" aria-hidden="true">
            Recent
          </p>
          <ul className="saved__list" aria-label="Recent">
            {recent.map(chip)}
          </ul>
          <button type="button" className="saved__clear" onClick={clearRecent}>
            Clear recent
          </button>
        </div>
      ) : null}
    </section>
  );
}
