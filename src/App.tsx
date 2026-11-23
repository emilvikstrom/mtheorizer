import { useEffect, useRef, useState } from "react";
import { ChordFinder } from "./components/ChordFinder";
import { CircleOfFifthsView } from "./components/CircleOfFifthsView";
import { Lookup, switchView } from "./components/Lookup";
import { ProgressionBuilder } from "./components/ProgressionBuilder";
import { ProgressionView } from "./components/ProgressionView";
import { Quiz } from "./components/Quiz";
import { OptionPicker } from "./components/OptionPicker";
import { ScaleFinder } from "./components/ScaleFinder";
import { Settings } from "./components/Settings";
import { SavedChoices } from "./components/SavedChoices";
import { type TabItem, Tabs, panelId, tabId } from "./components/Tabs";
import { ThemeSwitch } from "./components/ThemeSwitch";
import { Tonnetz } from "./components/Tonnetz";
import { rememberNeck, storedNeck } from "./neck";
import {
  type ChordRoute,
  type CircleRoute,
  type IdentifyRoute,
  type ScaleFinderRoute,
  type ScaleRoute,
  type ProgressionRoute,
  type TonnetzRoute,
  defaultChordRoute,
  defaultCircleRoute,
  defaultIdentifyRoute,
  defaultProgressionRoute,
  defaultQuizRoute,
  defaultSettingsRoute,
  defaultTonnetzRoute,
  navigate,
  neckOf,
  storedInstrument,
  storedLookupSetup,
  useRoute,
  withNeck,
} from "./route";
import { PROGRESSIONS, key, matchInversion, specOf } from "./theory";

type Tab =
  | "chords"
  | "scales"
  | "circle-of-fifths"
  | "progressions"
  | "identify"
  | "quiz"
  | "tonnetz"
  | "settings";

const TABS: readonly TabItem<Tab>[] = [
  { id: "chords", label: "Chords" },
  { id: "scales", label: "Scales" },
  { id: "circle-of-fifths", label: "Circle of fifths" },
  { id: "progressions", label: "Progressions" },
  { id: "identify", label: "What chord is this?" },
  { id: "tonnetz", label: "Tonnetz" },
  { id: "quiz", label: "Practice" },
  { id: "settings", label: "Settings" },
];

export function App() {
  const route = useRoute();
  const tab: Tab =
    route.page === "circle"
      ? "circle-of-fifths"
      : route.page === "progression" || route.page === "build"
        ? "progressions"
        : route.page === "identify"
          ? "identify"
          : route.page === "quiz"
            ? "quiz"
            : route.page === "tonnetz"
              ? "tonnetz"
              : route.page === "settings"
                ? "settings"
                : route.page === "scale" || route.page === "scaleFinder"
                  ? "scales"
                  : "chords";

  // Each tab keeps its own choice while you look at the other one.
  const lastChord = useRef<ChordRoute | undefined>(undefined);
  const lastScale = useRef<ScaleRoute | undefined>(undefined);
  const lastCircle = useRef<CircleRoute | undefined>(undefined);
  const lastProgression = useRef<ProgressionRoute | undefined>(undefined);
  const lastTonnetz = useRef<TonnetzRoute | undefined>(undefined);
  const lastIdentify = useRef<IdentifyRoute | undefined>(undefined);
  const lastFinder = useRef<ScaleFinderRoute | undefined>(undefined);
  useEffect(() => {
    if (route.page === "circle") lastCircle.current = route;
    else if (route.page === "progression") lastProgression.current = route;
    else if (route.page === "tonnetz") lastTonnetz.current = route;
    else if (route.page === "identify") lastIdentify.current = route;
    else if (route.page === "scaleFinder") lastFinder.current = route;
    else if (route.page === "chord" || route.page === "scale") {
      if (route.page === "chord") lastChord.current = route;
      else lastScale.current = route;
      // A link to a neck is the setup from now on, as if it had been chosen in the settings.
      const neck = neckOf(route);
      if (neck) rememberNeck(neck);
    }
  }, [route]);

  // The keys pressed in "What chord is this?" (MIDI numbers).
  const [pressed, setPressed] = useState<readonly number[]>([]);

  // A remembered chord or scale is shown on the neck as set up now, not as it was.
  const fresh = <R extends ChordRoute | ScaleRoute>(remembered: R): R => {
    return remembered.instrument === "piano" ? remembered : withNeck(remembered, storedNeck());
  };

  // Chords and scales are two tabs over the same root: moving between them keeps the root
  // and turns the chord into its scale (and back), as the old Chord/Scale switch did.
  const showLookup = (view: "chord" | "scale") => {
    if (route.page === "chord" || route.page === "scale") {
      navigate(switchView(route, view, lastChord.current));
    } else {
      const last = view === "chord" ? lastChord.current : lastScale.current;
      const other = view === "chord" ? lastScale.current : lastChord.current;
      const from = other ?? defaultChordRoute(storedInstrument());
      navigate(fresh(last ?? switchView(from, view, lastChord.current)));
    }
  };

  const showTab = (next: Tab) =>
    next === tab
      ? undefined
      : next === "chords" || next === "scales"
        ? showLookup(next === "chords" ? "chord" : "scale")
        : navigate(
            next === "circle-of-fifths"
              ? (lastCircle.current ?? defaultCircleRoute())
              : next === "progressions"
                ? (lastProgression.current ?? defaultProgressionRoute())
                : next === "identify"
                  ? (lastIdentify.current ?? defaultIdentifyRoute())
                  : next === "quiz"
                    ? defaultQuizRoute()
                    : next === "tonnetz"
                      ? (lastTonnetz.current ?? defaultTonnetzRoute())
                      : next === "settings"
                        ? defaultSettingsRoute()
                        : defaultChordRoute(storedInstrument()),
          );

  // The scales tab looks a scale up, or finds the scales that hold some notes.
  const scaleMode = (
    <OptionPicker
      legend="Scales"
      name="scale-mode"
      options={[
        { value: "lookup", label: "Look up a scale" },
        { value: "find", label: "Find from notes" },
      ]}
      value={route.page === "scaleFinder" ? "find" : "lookup"}
      onChange={(mode) =>
        mode === "find"
          ? navigate(lastFinder.current ?? { page: "scaleFinder", notes: [] })
          : showLookup("scale")
      }
    />
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
                ...storedLookupSetup(),
              })
            }
          />
        ) : route.page === "build" ? (
          <ProgressionBuilder
            keyValue={route.key}
            steps={route.steps}
            onChange={(key, steps) => navigate({ page: "build", key, steps })}
            onBack={() => navigate(lastProgression.current ?? defaultProgressionRoute())}
            onOpenChord={(root, quality) =>
              navigate({
                page: "chord",
                root,
                spec: specOf(quality),
                inversion: 0,
                ...storedLookupSetup(),
              })
            }
          />
        ) : route.page === "progression" ? (
          <ProgressionView
            tonic={route.tonic}
            id={route.id}
            onChange={(tonic, id) => navigate({ page: "progression", tonic, id })}
            onBuild={() =>
              navigate({
                page: "build",
                key: key(route.tonic, PROGRESSIONS[route.id].mode),
                steps: [],
              })
            }
            onOpenChord={(root, quality) =>
              navigate({
                page: "chord",
                root,
                spec: specOf(quality),
                inversion: 0,
                ...storedLookupSetup(),
              })
            }
          />
        ) : route.page === "identify" ? (
          <ChordFinder
            route={route}
            onRoute={navigate}
            selected={pressed}
            onChange={setPressed}
            onOpen={(match) =>
              navigate({
                page: "chord",
                root: match.chord.root,
                spec: specOf(match.chord.quality.id),
                inversion: matchInversion(match),
                ...storedLookupSetup(),
              })
            }
          />
        ) : route.page === "quiz" ? (
          <Quiz route={route} onChange={navigate} />
        ) : route.page === "settings" ? (
          <Settings />
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
                ...storedLookupSetup(),
              })
            }
          />
        ) : route.page === "scaleFinder" ? (
          <>
            {scaleMode}
            <ScaleFinder
              notes={route.notes}
              onChange={(notes) => navigate({ page: "scaleFinder", notes }, { replace: true })}
              onOpen={(scale) =>
                navigate({
                  page: "scale",
                  root: scale.tonic,
                  scaleId: scale.scale.id,
                  ...storedLookupSetup(),
                })
              }
            />
          </>
        ) : (
          <>
            {route.page === "scale" && scaleMode}
            <SavedChoices route={route} onOpen={navigate} />
            <Lookup route={route} onChange={navigate} />
          </>
        )}
      </div>
    </main>
  );
}
