import { useEffect, useState } from "react";
import {
  DARK_QUERY,
  THEME_CHOICES,
  THEME_LABELS,
  type ThemeChoice,
  applyTheme,
  readThemeChoice,
  saveThemeChoice,
} from "../theme";
import { OptionPicker } from "./OptionPicker";

const OPTIONS = THEME_CHOICES.map((value) => ({ value, label: THEME_LABELS[value] }));

/**
 * Chooses the colour theme: follow the system, or light or dark. The choice is
 * remembered, and "System" follows the system when it changes while the page is open.
 */
export function ThemeSwitch() {
  const [choice, setChoice] = useState<ThemeChoice>(readThemeChoice);

  useEffect(() => {
    applyTheme(choice);
    if (choice !== "system" || typeof matchMedia !== "function") return;
    const query = matchMedia(DARK_QUERY);
    const follow = () => applyTheme("system");
    query.addEventListener("change", follow);
    return () => query.removeEventListener("change", follow);
  }, [choice]);

  const change = (next: ThemeChoice) => {
    saveThemeChoice(next);
    setChoice(next);
  };

  return (
    <div className="theme-switch">
      <OptionPicker
        legend="Theme"
        name="theme"
        options={OPTIONS}
        value={choice}
        onChange={change}
      />
    </div>
  );
}
