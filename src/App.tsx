import { useState } from 'react';
import { ChordLookup } from './components/ChordLookup';
import { CircleOfFifthsView } from './components/CircleOfFifthsView';
import { type TabItem, Tabs, panelId, tabId } from './components/Tabs';

type View = 'chords' | 'circle-of-fifths';

const VIEWS: readonly TabItem<View>[] = [
  { id: 'chords', label: 'Chords' },
  { id: 'circle-of-fifths', label: 'Circle of fifths' },
];

export function App() {
  const [view, setView] = useState<View>('chords');

  return (
    <main className="app">
      <header className="app__header">
        <h1 className="app__title">mtheorizer</h1>
        <p className="app__tagline">Look up chords and keys.</p>
      </header>

      <Tabs label="Views" tabs={VIEWS} value={view} onChange={setView} />

      <div className="app__panel" role="tabpanel" id={panelId(view)} aria-labelledby={tabId(view)}>
        {view === 'chords' ? <ChordLookup /> : <CircleOfFifthsView />}
      </div>
    </main>
  );
}
