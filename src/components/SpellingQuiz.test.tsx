import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { type QuizRoute } from "../route";
import {
  type Note,
  type SpellingQuestion,
  allSpellings,
  expectedNotes,
  formatNote,
  pitchClass,
  spellingDeck,
  spellingTitle,
} from "../theory";
import { Quiz } from "./Quiz";

/** The quiz as the app wires it up: the route is state, and changes are recorded. */
function Harness({ start, log }: { start: QuizRoute; log: QuizRoute[] }) {
  const [route, setRoute] = useState(start);
  return (
    <Quiz
      route={route}
      onChange={(next) => {
        log.push(next);
        setRoute(next);
      }}
    />
  );
}

const SEED = 5;
const first = spellingDeck(SEED)[0] as SpellingQuestion;
const second = spellingDeck(SEED)[1] as SpellingQuestion;
const start: QuizRoute = { page: "quiz", mode: "spelling", seed: SEED };

const typedAnswer = (notes: readonly Note[]) => notes.map(formatNote).join(" ");

describe("Quiz: the spelling drill", () => {
  it("switches between the two quizzes", async () => {
    const user = userEvent.setup();
    const log: QuizRoute[] = [];
    render(<Harness start={{ page: "quiz" }} log={log} />);
    expect(screen.getByRole("heading", { level: 2, name: "Key signatures" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Spelling" }));
    expect(screen.getByRole("heading", { level: 2, name: "Spelling" })).toBeInTheDocument();
    // The key-signature quiz put its seed in the link first; then came the click.
    expect(log[1]).toEqual({ page: "quiz", mode: "spelling" });
    await user.click(screen.getByRole("button", { name: "Key signatures" }));
    expect(screen.getByRole("heading", { level: 2, name: "Key signatures" })).toBeInTheDocument();
  });

  it("puts a seed in the link when the link has none", () => {
    const log: QuizRoute[] = [];
    render(<Harness start={{ page: "quiz", mode: "spelling" }} log={log} />);
    expect(log).toHaveLength(1);
    expect(log[0]?.seed).toEqual(expect.any(Number));
  });

  it("asks the first question of the seed's set", () => {
    render(<Harness start={start} log={[]} />);
    expect(screen.getByText(`Spell ${spellingTitle(first)}`)).toBeInTheDocument();
    expect(screen.getByText(/Nothing answered yet\./)).toBeInTheDocument();
  });

  it("scores a typed answer with the right spelling", async () => {
    const user = userEvent.setup();
    render(<Harness start={start} log={[]} />);
    await user.click(screen.getByRole("button", { name: "Type" }));
    await user.type(screen.getByRole("textbox"), typedAnswer(expectedNotes(first).required));
    await user.click(screen.getByRole("button", { name: "Check" }));
    expect(screen.getByRole("status")).toHaveTextContent(/^Right\./);
    expect(screen.getByText(/^1 of 1 right\./)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next question" }));
    expect(screen.getByText(`Spell ${spellingTitle(second)}`)).toBeInTheDocument();
  });

  it("scores a wrong answer and says what the notes are", async () => {
    const user = userEvent.setup();
    render(<Harness start={start} log={[]} />);
    await user.click(screen.getByRole("button", { name: "Type" }));
    await user.type(screen.getByRole("textbox"), "C");
    await user.click(screen.getByRole("button", { name: "Check" }));
    expect(screen.getByRole("status")).toHaveTextContent(/^Not quite\./);
    expect(screen.getByRole("status")).toHaveTextContent(spellingTitle(first));
    expect(screen.getByText(/^0 of 1 right\./)).toBeInTheDocument();
  });

  it("asks for a name for a pressed key and scores the piano answer", async () => {
    const user = userEvent.setup();
    render(<Harness start={start} log={[]} />);
    const { required } = expectedNotes(first);
    // Press each key (once per pitch class), then pick its spelling.
    const keys = [...new Set(required.map(pitchClass))];
    const names = ["C", "C♯/D♭", "D", "D♯/E♭", "E", "F", "F♯/G♭", "G", "G♯/A♭", "A", "A♯/B♭", "B"];
    for (const pc of keys) {
      await user.click(screen.getByRole("button", { name: `${names[pc]}4` }));
    }
    // A black key has no spelling until one is chosen, so the answer cannot be checked yet.
    const blackKeys = keys.filter((pc) => [1, 3, 6, 8, 10].includes(pc));
    if (blackKeys.length > 0) {
      expect(screen.getByRole("button", { name: "Check" })).toBeDisabled();
    }
    for (const n of required) {
      const group = screen.getByRole("group", { name: `Spell the ${names[pitchClass(n)]} key` });
      const buttons = group.querySelectorAll("button");
      const wanted = [...buttons].find((b) => b.textContent === formatNote(n));
      if (!wanted) throw new Error(`no button for ${formatNote(n)}`);
      await user.click(wanted);
    }
    await user.click(screen.getByRole("button", { name: "Check" }));
    expect(screen.getByRole("status")).toHaveTextContent(/^Right\./);
  });

  it("counts the right keys with the wrong spelling as wrong", async () => {
    const user = userEvent.setup();
    // A set whose first question has flats and nothing worse: answer it with sharps.
    const flats = (q: SpellingQuestion | undefined) =>
      q !== undefined &&
      expectedNotes(q).required.some((n) => n.accidental === -1) &&
      expectedNotes(q).required.every((n) => Math.abs(n.accidental) <= 1);
    let seed = 1;
    while (!flats(spellingDeck(seed)[0])) seed++;
    const q = spellingDeck(seed)[0] as SpellingQuestion;
    const sharpened = expectedNotes(q)
      .required.map((n) =>
        n.accidental === -1
          ? (allSpellings(pitchClass(n)).find((m) => m.accidental === 1) ?? n)
          : n,
      )
      .map(formatNote)
      .join(" ");
    render(<Harness start={{ page: "quiz", mode: "spelling", seed }} log={[]} />);
    await user.click(screen.getByRole("button", { name: "Type" }));
    await user.type(screen.getByRole("textbox"), sharpened);
    await user.click(screen.getByRole("button", { name: "Check" }));
    expect(screen.getByRole("status")).toHaveTextContent(/^Not quite\./);
    expect(screen.getByRole("status")).toHaveTextContent(/is the right key but is spelled/);
    expect(screen.getByText(/^0 of 1 right\./)).toBeInTheDocument();
  });

  it("tells a typed answer that makes no sense", async () => {
    const user = userEvent.setup();
    render(<Harness start={start} log={[]} />);
    await user.click(screen.getByRole("button", { name: "Type" }));
    await user.type(screen.getByRole("textbox"), "Eb flat");
    await user.click(screen.getByRole("button", { name: "Check" }));
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/^Nothing answered yet\./)).toBeInTheDocument();
  });

  it("limits the questions to the chosen groups and keeps them in the link", async () => {
    const user = userEvent.setup();
    const log: QuizRoute[] = [];
    render(<Harness start={start} log={log} />);
    for (const name of [
      "Sixths",
      "Sevenths",
      "Ninths",
      "Elevenths",
      "Thirteenths",
      "Added tones",
      "Scales",
    ]) {
      await user.click(screen.getByRole("checkbox", { name }));
    }
    expect(log.at(-1)).toEqual({ page: "quiz", mode: "spelling", seed: SEED, groups: ["triads"] });
    const triads = spellingDeck(SEED, ["triads"]);
    expect(
      screen.getByText(`Spell ${spellingTitle(triads[0] as SpellingQuestion)}`),
    ).toBeInTheDocument();
    // The last group cannot be turned off.
    await user.click(screen.getByRole("checkbox", { name: "Triads" }));
    expect(screen.getByRole("checkbox", { name: "Triads" })).toBeChecked();
  });

  it("gives a new set with a new seed", async () => {
    const user = userEvent.setup();
    const log: QuizRoute[] = [];
    render(<Harness start={start} log={log} />);
    await user.click(screen.getAllByRole("button", { name: "New set" })[0] as HTMLElement);
    expect(log.at(-1)?.seed).not.toBe(SEED);
    expect(log.at(-1)?.mode).toBe("spelling");
  });
});
