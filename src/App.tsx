import { useEffect, useRef, useState } from "react";
import { ChordFinder } from "./components/ChordFinder";
import { CircleOfFifthsView } from "./components/CircleOfFifthsView";
import { Lookup } from "./components/Lookup";
import { SavedChoices } from "./components/SavedChoices";
import { type TabItem, Tabs, panelId, tabId } from "./components/Tabs";
import {
  type CircleRoute,
  type LookupRoute,
  defaultChordRoute,
  defaultCircleRoute,
  defaultIdentifyRoute,
  navigate,
  storedInstrument,
  useRoute,
} from "./route";
import { matchInversion, specOf } from "./theory";

type Tab = "lookup" | "circle-of-fifths" | "identify";

const TABS: readonly TabItem<Tab>[] = [
  { id: "lookup", label: "Chords & scales" },
  { id: "circle-of-fifths", label: "Circle of fifths" },
  { id: "identify", label: "What chord is this?" },
];

export function App() {
  const route = useRoute();
  const tab: Tab =
    route.page === "circle"
      ? "circle-of-fifths"
      : route.page === "identify"
        ? "identify"
        : "lookup";

  // Each tab keeps its own choice while you look at the other one.
  const lastLookup = useRef<LookupRoute | undefined>(undefined);
  const lastCircle = useRef<CircleRoute | undefined>(undefined);
  useEffect(() => {
    if (route.page === "circle") lastCircle.current = route;
    else if (route.page === "chord" || route.page === "scale") lastLookup.current = route;
  }, [route]);

  // The keys pressed in "What chord is this?" (MIDI numbers).
  const [pressed, setPressed] = useState<readonly number[]>([]);

  const showTab = (next: Tab) =>
    navigate(
      next === "circle-of-fifths"
        ? (lastCircle.current ?? defaultCircleRoute())
        : next === "identify"
          ? defaultIdentifyRoute()
          : (lastLookup.current ?? defaultChordRoute(storedInstrument())),
    );

  return (
    <main className="app">
      <header className="app__header">
        <h1 className="app__title">mtheorizer</h1>
        <p className="app__tagline">Look up chords, scales and keys.</p>
      </header>

      <Tabs label="Views" tabs={TABS} value={tab} onChange={showTab} />

      <div className="app__panel" role="tabpanel" id={panelId(tab)} aria-labelledby={tabId(tab)}>
        {route.page === "circle" ? (
          <CircleOfFifthsView
            value={route.key}
            onChange={(key) => navigate({ page: "circle", key })}
            onOpenChord={(root, quality) =>
              navigate({
                page: "chord",
                root,
                spec: specOf(quality),
                inversion: 0,
                instrument: storedInstrument(),
              })
            }
          />
        ) : route.page === "identify" ? (
          <ChordFinder
            selected={pressed}
            onChange={setPressed}
            onOpen={(match) =>
              navigate({
                page: "chord",
                root: match.chord.root,
                spec: specOf(match.chord.quality.id),
                inversion: matchInversion(match),
                instrument: storedInstrument(),
              })
            }
          />
        ) : (
          <>
            <SavedChoices route={route} onOpen={navigate} />
            <Lookup route={route} onChange={navigate} />
          </>
        )}
      </div>
    </main>
  );
}
