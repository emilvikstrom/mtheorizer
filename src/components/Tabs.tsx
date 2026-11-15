import { type KeyboardEvent, useRef } from "react";

export interface TabItem<Id extends string> {
  readonly id: Id;
  readonly label: string;
}

interface TabsProps<Id extends string> {
  label: string;
  tabs: readonly TabItem<Id>[];
  value: Id;
  onChange: (id: Id) => void;
}

export const tabId = (id: string) => `tab-${id}`;
export const panelId = (id: string) => `panel-${id}`;

/** A WAI-ARIA tab list: arrow keys, Home and End move between tabs. */
export function Tabs<Id extends string>({ label, tabs, value, onChange }: TabsProps<Id>) {
  const refs = useRef(new Map<Id, HTMLButtonElement>());

  function onKeyDown(event: KeyboardEvent) {
    const index = tabs.findIndex((t) => t.id === value);
    const last = tabs.length - 1;
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % tabs.length
        : event.key === "ArrowLeft"
          ? (index + last) % tabs.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : undefined;
    const tab = next === undefined ? undefined : tabs[next];
    if (!tab) return;
    event.preventDefault();
    onChange(tab.id);
    refs.current.get(tab.id)?.focus();
  }

  return (
    <div className="tabs" role="tablist" aria-label={label} onKeyDown={onKeyDown}>
      {tabs.map((tab) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              if (el) refs.current.set(tab.id, el);
              else refs.current.delete(tab.id);
            }}
            type="button"
            role="tab"
            id={tabId(tab.id)}
            className="tabs__tab"
            aria-selected={selected}
            aria-controls={panelId(tab.id)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
