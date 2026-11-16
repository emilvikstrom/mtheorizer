import { useEffect, useState } from "react";
import type { LookupRoute } from "../route";
import {
  FAVORITES_KEY,
  RECENT_KEY,
  addRecent,
  hashOf,
  loadList,
  routeOf,
  saveList,
  toggleFavorite,
} from "../saved";
import { SCALES, buildChord, formatNote, inversionSymbol } from "../theory";

/** Short name of a stored choice: "Cm7", "C/E", "A Natural minor". */
function labelOf(route: LookupRoute): string {
  if (route.page === "scale") return `${formatNote(route.root)} ${SCALES[route.scaleId].name}`;
  return inversionSymbol(buildChord(route.root, route.quality), route.inversion);
}

const instrumentOf = (route: LookupRoute) => (route.instrument === "guitar" ? "Guitar" : "Piano");

interface Props {
  /** The choice on screen. It is added to the recent list. */
  readonly route: LookupRoute;
  /** Restores a whole saved choice. */
  readonly onOpen: (route: LookupRoute) => void;
}

/** Recent choices and pinned favourites, kept in localStorage. One click restores the whole choice. */
export function SavedChoices({ route, onOpen }: Props) {
  const [recent, setRecent] = useState(() => loadList(RECENT_KEY));
  const [favorites, setFavorites] = useState(() => loadList(FAVORITES_KEY));
  const current = hashOf(route);

  // The choice on screen joins the recent list as soon as it changes (adjusted while rendering).
  const [seen, setSeen] = useState<string>();
  if (seen !== current) {
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
    const isFavorite = favorites.includes(hash);
    return (
      <li key={hash} className="saved__item">
        <button
          type="button"
          className="saved__open"
          aria-current={hash === current ? "true" : undefined}
          aria-label={`Open ${label} (${instrumentOf(saved)})`}
          onClick={() => onOpen(saved)}
        >
          <span className="saved__label">{label}</span>
          {saved.instrument === "guitar" ? <span className="saved__meta">Guitar</span> : null}
        </button>
        <button
          type="button"
          className="saved__pin"
          aria-pressed={isFavorite}
          aria-label={`Favorite ${label} (${instrumentOf(saved)})`}
          onClick={() => toggle(hash)}
        >
          {isFavorite ? "★" : "☆"}
        </button>
      </li>
    );
  };

  if (recent.length === 0 && favorites.length === 0) return null;

  return (
    <section className="saved" aria-label="Recent and favorite choices">
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
