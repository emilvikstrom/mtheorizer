import { useState } from 'react';
import { CircleOfFifthsView } from './components/CircleOfFifthsView';
import { Lookup } from './components/Lookup';
import { type TabItem, Tabs, panelId, tabId } from './components/Tabs';

type Tab = 'lookup' | 'circle-of-fifths';

const TABS: readonly TabItem<Tab>[] = [
  { id: 'lookup', label: 'Chords & scales' },
  { id: 'circle-of-fifths', label: 'Circle of fifths' },
];

export function App() {
  const [tab, setTab] = useState<Tab>('lookup');

  return (
    <main className="app">
      <header className="app__header">
        <h1 className="app__title">mtheorizer</h1>
        <p className="app__tagline">Look up chords, scales and keys.</p>
      </header>

      <Tabs label="Views" tabs={TABS} value={tab} onChange={setTab} />

      <div className="app__panel" role="tabpanel" id={panelId(tab)} aria-labelledby={tabId(tab)}>
        {tab === 'lookup' ? <Lookup /> : <CircleOfFifthsView />}
      </div>
    </main>
  );
}
