import { useEffect, useRef } from "react";
import { CircleOfFifthsView } from "./components/CircleOfFifthsView";
import { Lookup } from "./components/Lookup";
import { ProgressionView } from "./components/ProgressionView";
import { SavedChoices } from "./components/SavedChoices";
import { type TabItem, Tabs, panelId, tabId } from "./components/Tabs";
import {
  type CircleRoute,
  type LookupRoute,
  type ProgressionRoute,
  defaultChordRoute,
  defaultCircleRoute,
  defaultProgressionRoute,
  navigate,
  storedInstrument,
  useRoute,
} from "./route";
import { specOf } from "./theory";

type Tab = "lookup" | "circle-of-fifths" | "progressions";

const TABS: readonly TabItem<Tab>[] = [
  { id: "lookup", label: "Chords & scales" },
  { id: "circle-of-fifths", label: "Circle of fifths" },
  { id: "progressions", label: "Progressions" },
];

export function App() {
  const route = useRoute();
  const tab: Tab =
    route.page === "circle"
      ? "circle-of-fifths"
      : route.page === "progression"
        ? "progressions"
        : "lookup";

  // Each tab keeps its own choice while you look at the other one.
  const lastLookup = useRef<LookupRoute | undefined>(undefined);
  const lastCircle = useRef<CircleRoute | undefined>(undefined);
  const lastProgression = useRef<ProgressionRoute | undefined>(undefined);
  useEffect(() => {
    if (route.page === "circle") lastCircle.current = route;
    else if (route.page === "progression") lastProgression.current = route;
    else lastLookup.current = route;
  }, [route]);

  const showTab = (next: Tab) =>
    navigate(
      next === "circle-of-fifths"
        ? (lastCircle.current ?? defaultCircleRoute())
        : next === "progressions"
          ? (lastProgression.current ?? defaultProgressionRoute())
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
        ) : route.page === "progression" ? (
          <ProgressionView
            tonic={route.tonic}
            id={route.id}
            onChange={(tonic, id) => navigate({ page: "progression", tonic, id })}
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
