import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type QuizRoute } from "../route";
import {
  CHORD_QUALITIES,
  listeningChord,
  listeningDeck,
  listeningKeys,
  listeningLevel,
} from "../theory";
import { Quiz } from "./Quiz";

// Sound is not played in tests; the drill's calls are what is checked.
const audio = vi.hoisted(() => ({ play: vi.fn(() => 0), stop: vi.fn() }));
vi.mock("../audio/playback", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../audio/playback")>()),
  audioSupported: () => true,
  playNotes: audio.play,
  stopPlayback: audio.stop,
}));

beforeEach(() => {
  audio.play.mockClear();
  audio.stop.mockClear();
});

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

const SEED = 11;
const deck = listeningDeck(SEED);
const first = deck[0]!;
const second = deck[1]!;
const start: QuizRoute = { page: "quiz", mode: "listening", seed: SEED };
const answerName = (q: typeof first) => CHORD_QUALITIES[q.qualityId].name;
const wrongName = (q: typeof first) =>
  listeningLevel("triads")
    .qualities.map((id) => CHORD_QUALITIES[id].name)
    .find((name) => name !== answerName(q))!;

describe("Quiz: the listening drill", () => {
  it("is a third mode of Practice", async () => {
    const user = userEvent.setup();
    const log: QuizRoute[] = [];
    render(<Harness start={{ page: "quiz" }} log={log} />);
    await user.click(screen.getByRole("button", { name: "Listening" }));
    expect(screen.getByRole("heading", { level: 2, name: "Listening" })).toBeInTheDocument();
    expect(log[0]).toEqual({ page: "quiz", mode: "listening" });
    await user.click(screen.getByRole("button", { name: "Spelling" }));
    expect(screen.getByRole("heading", { level: 2, name: "Spelling" })).toBeInTheDocument();
  });

  it("puts a seed in the link when the link has none", () => {
    const log: QuizRoute[] = [];
    render(<Harness start={{ page: "quiz", mode: "listening" }} log={log} />);
    expect(log).toHaveLength(1);
    expect(log[0]?.seed).toEqual(expect.any(Number));
  });

  it("plays the first chord of the seed without naming it", async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness start={start} log={[]} />);
    expect(screen.getByText(/Nothing answered yet\./)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Play the chord/ }));
    expect(audio.play).toHaveBeenCalledTimes(1);
    const plan = audio.play.mock.calls[0] as unknown as [{ midi: number }[]];
    expect(plan[0].map((n) => n.midi).sort((a, b) => a - b)).toEqual(
      listeningKeys(first)
        .map((k) => k.midi)
        .sort((a, b) => a - b),
    );
    // Nothing on the page gives the chord away, and there is no keyboard to read it from.
    const chord = listeningChord(first);
    expect(container.textContent).not.toContain(chord.symbol + " ");
    expect(container.textContent).not.toContain(chord.name);
    expect(container.querySelector("svg")).toBeNull();
  });

  it("scores a right answer, then shows the chord and its keys", async () => {
    const user = userEvent.setup();
    render(<Harness start={start} log={[]} />);
    await user.click(screen.getByRole("button", { name: answerName(first) }));
    expect(screen.getByRole("status")).toHaveTextContent(/^Right\./);
    expect(screen.getByRole("status")).toHaveTextContent(listeningChord(first).symbol);
    expect(screen.getByText(/^1 of 1 right\./)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: new RegExp(listeningChord(first).name) })).toBeTruthy();
  });

  it("scores a wrong answer and locks the choice", async () => {
    const user = userEvent.setup();
    render(<Harness start={start} log={[]} />);
    await user.click(screen.getByRole("button", { name: wrongName(first) }));
    expect(screen.getByRole("status")).toHaveTextContent(/^Not quite\./);
    expect(screen.getByText(/^0 of 1 right\./)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: answerName(first) })).toBeDisabled();
  });

  it("goes on to the next chord and plays it", async () => {
    const user = userEvent.setup();
    render(<Harness start={start} log={[]} />);
    await user.click(screen.getByRole("button", { name: answerName(first) }));
    audio.play.mockClear();
    await user.click(screen.getByRole("button", { name: "Next question" }));
    expect(screen.getByText(/Question 2 of /)).toBeInTheDocument();
    expect(audio.play).toHaveBeenCalledTimes(1);
    const plan = audio.play.mock.calls[0] as unknown as [{ midi: number }[]];
    expect(plan[0].map((n) => n.midi).sort((a, b) => a - b)).toEqual(
      listeningKeys(second)
        .map((k) => k.midi)
        .sort((a, b) => a - b),
    );
  });

  it("changes the level in the link and offers its qualities", async () => {
    const user = userEvent.setup();
    const log: QuizRoute[] = [];
    render(<Harness start={start} log={log} />);
    await user.click(screen.getByRole("button", { name: "Seventh chords" }));
    expect(log.at(-1)).toEqual({ page: "quiz", mode: "listening", seed: SEED, level: "sevenths" });
    expect(screen.getByRole("button", { name: "dominant seventh" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "augmented" })).toBeNull();
  });

  it("turns inversions on in the link", async () => {
    const user = userEvent.setup();
    const log: QuizRoute[] = [];
    render(<Harness start={start} log={log} />);
    await user.click(screen.getByRole("checkbox", { name: /inversions/ }));
    expect(log.at(-1)).toEqual({
      page: "quiz",
      mode: "listening",
      seed: SEED,
      inversions: true,
    });
  });

  it("starts a new set with another seed", async () => {
    const user = userEvent.setup();
    const log: QuizRoute[] = [];
    render(<Harness start={start} log={log} />);
    await user.click(screen.getByRole("button", { name: "New set" }));
    expect(log.at(-1)?.mode).toBe("listening");
    expect(log.at(-1)?.seed).not.toBe(SEED);
  });

  it("runs through a whole set and then offers a new one", async () => {
    const user = userEvent.setup();
    render(<Harness start={{ ...start, level: "basic" }} log={[]} />);
    const set = listeningDeck(SEED, "basic");
    for (const q of set) {
      await user.click(screen.getByRole("button", { name: answerName(q) }));
      await user.click(screen.getByRole("button", { name: "Next question" }));
    }
    expect(screen.getByText(/every question in this set: 24 of 24 right/)).toBeInTheDocument();
  });
});
