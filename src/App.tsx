import { useEffect, useRef, useState } from "react";
import { ChordFinder } from "./components/ChordFinder";
import { CircleOfFifthsView } from "./components/CircleOfFifthsView";
import { Lookup } from "./components/Lookup";
import { ProgressionView } from "./components/ProgressionView";
import { Quiz } from "./components/Quiz";
import { SavedChoices } from "./components/SavedChoices";
import { type TabItem, Tabs, panelId, tabId } from "./components/Tabs";
import { ThemeSwitch } from "./components/ThemeSwitch";
import { Tonnetz } from "./components/Tonnetz";
import {
  type CircleRoute,
  type LookupRoute,
  type ProgressionRoute,
  type TonnetzRoute,
  defaultChordRoute,
  defaultCircleRoute,
  defaultIdentifyRoute,
  defaultProgressionRoute,
  defaultQuizRoute,
  defaultTonnetzRoute,
  navigate,
  storedInstrument,
  useRoute,
} from "./route";
import { matchInversion, specOf } from "./theory";

type Tab = "lookup" | "circle-of-fifths" | "progressions" | "identify" | "quiz" | "tonnetz";

const TABS: readonly TabItem<Tab>[] = [
  { id: "lookup", label: "Chords & scales" },
  { id: "circle-of-fifths", label: "Circle of fifths" },
  { id: "progressions", label: "Progressions" },
  { id: "identify", label: "What chord is this?" },
  { id: "tonnetz", label: "Tonnetz" },
  { id: "quiz", label: "Practice" },
];

export function App() {
  const route = useRoute();
  const tab: Tab =
    route.page === "circle"
      ? "circle-of-fifths"
      : route.page === "progression"
        ? "progressions"
        : route.page === "identify"
          ? "identify"
          : route.page === "quiz"
            ? "quiz"
            : route.page === "tonnetz"
              ? "tonnetz"
              : "lookup";

  // Each tab keeps its own choice while you look at the other one.
  const lastLookup = useRef<LookupRoute | undefined>(undefined);
  const lastCircle = useRef<CircleRoute | undefined>(undefined);
  const lastProgression = useRef<ProgressionRoute | undefined>(undefined);
  const lastTonnetz = useRef<TonnetzRoute | undefined>(undefined);
  useEffect(() => {
    if (route.page === "circle") lastCircle.current = route;
    else if (route.page === "progression") lastProgression.current = route;
    else if (route.page === "tonnetz") lastTonnetz.current = route;
    else if (route.page === "chord" || route.page === "scale") lastLookup.current = route;
  }, [route]);

  // The keys pressed in "What chord is this?" (MIDI numbers).
  const [pressed, setPressed] = useState<readonly number[]>([]);

  const showTab = (next: Tab) =>
    navigate(
      next === "circle-of-fifths"
        ? (lastCircle.current ?? defaultCircleRoute())
        : next === "progressions"
          ? (lastProgression.current ?? defaultProgressionRoute())
          : next === "identify"
            ? defaultIdentifyRoute()
            : next === "quiz"
              ? defaultQuizRoute()
              : next === "tonnetz"
                ? (lastTonnetz.current ?? defaultTonnetzRoute())
                : (lastLookup.current ?? defaultChordRoute(storedInstrument())),
    );

  return (
    <main className="app">
      <header className="app__header">
        <div>
          <h1 className="app__title">mtheorizer</h1>
          <p className="app__tagline">Look up chords, scales and keys.</p>
        </div>
        <ThemeSwitch />
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
        ) : route.page === "quiz" ? (
          <Quiz route={route} onChange={navigate} />
        ) : route.page === "tonnetz" ? (
          <Tonnetz
            triad={{ root: route.root, mode: route.mode }}
            onChange={(triad) => navigate({ page: "tonnetz", root: triad.root, mode: triad.mode })}
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
