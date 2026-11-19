import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  type KeyQuestion,
  allQuestions,
  formatKey,
  formatNote,
  keyDeck,
  keysFor,
  newDeck,
  seededRandom,
  signatureOf,
} from "../theory";
import { type QuizRoute } from "../route";
import { KeyQuiz, describeSignature } from "./KeyQuiz";

/** The questions of the session that `seed` gives, in the order they are asked. */
const sessionOf = (seed: number) => newDeck(seededRandom(seed));

const seedWith = (type: "count" | "find") => {
  for (let seed = 1; seed < 100; seed++) if (sessionOf(seed)[0]?.type === type) return seed;
  throw new Error("no seed");
};

/** The answer buttons (not the controls above them). */
const answers = () => within(screen.getByRole("group", { name: "Answers" })).getAllByRole("button");

const wording = (q: KeyQuestion) =>
  q.type === "count"
    ? `How many sharps or flats does ${formatKey(q.key)} have?`
    : `Which ${q.mode} key has ${describeSignature(q.signature)}?`;

const rightName = (q: KeyQuestion) =>
  q.type === "count"
    ? signatureOf(q.key).count === 0
      ? "None"
      : describeSignature(signatureOf(q.key))
    : `${formatNote(q.key.tonic)} ${q.mode}`;

describe("describeSignature", () => {
  it.each([
    [{ kind: "none", count: 0 }, "no sharps or flats"],
    [{ kind: "sharps", count: 1 }, "1 sharp"],
    [{ kind: "flats", count: 3 }, "3 flats"],
  ] as const)("%j is %s", (signature, text) => {
    expect(describeSignature(signature)).toBe(text);
  });
});

describe("KeyQuiz: how many?", () => {
  const seed = seedWith("count");
  const question = sessionOf(seed)[0] as KeyQuestion;
  // A wrong answer for this question.
  const wrong = signatureOf(question.key).count === 7 ? "1 sharp" : "7 sharps";

  it("asks how many sharps or flats a key has", () => {
    render(<KeyQuiz random={seededRandom(seed)} />);
    expect(screen.getByText(wording(question))).toBeInTheDocument();
    expect(screen.getByText("Nothing answered yet.")).toBeInTheDocument();
    // None, one to seven sharps and one to seven flats.
    expect(answers()).toHaveLength(15);
  });

  it("scores a right answer and shows the circle of fifths", async () => {
    const user = userEvent.setup();
    render(<KeyQuiz random={seededRandom(seed)} />);
    await user.click(screen.getByRole("button", { name: rightName(question) }));
    expect(screen.getByText("1 of 1 right.")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/^Right\./);
    expect(screen.getByRole("status")).toHaveTextContent(`${formatKey(question.key)} has`);
    expect(screen.getByRole("figure")).toBeInTheDocument();
    // Answered: the answers are locked.
    expect(screen.getByRole("button", { name: wrong })).toBeDisabled();
  });

  it("says what is right after a wrong answer, and does not score it", async () => {
    const user = userEvent.setup();
    render(<KeyQuiz random={seededRandom(seed)} />);
    await user.click(screen.getByRole("button", { name: wrong }));
    expect(screen.getByText("0 of 1 right.")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/^Not quite\./);
    expect(screen.getByRole("status")).toHaveTextContent(
      `has ${describeSignature(signatureOf(question.key))}`,
    );
  });

  it("moves on to the next question in the deck", async () => {
    const user = userEvent.setup();
    render(<KeyQuiz random={seededRandom(seed)} />);
    await user.click(screen.getByRole("button", { name: wrong }));
    await user.click(screen.getByRole("button", { name: "Next question" }));
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByText("0 of 1 right.")).toBeInTheDocument();
    expect(screen.getByText(wording(sessionOf(seed)[1] as KeyQuestion))).toBeInTheDocument();
  });
});

describe("KeyQuiz: which key?", () => {
  const seed = seedWith("find");
  const question = sessionOf(seed)[0] as KeyQuestion;

  it("asks for a key with a signature and offers the 15 tonics", () => {
    render(<KeyQuiz random={seededRandom(seed)} />);
    expect(screen.getByText(wording(question))).toBeInTheDocument();
    expect(answers()).toHaveLength(15);
  });

  it("takes the right tonic", async () => {
    const user = userEvent.setup();
    render(<KeyQuiz random={seededRandom(seed)} />);
    await user.click(screen.getByRole("button", { name: rightName(question) }));
    expect(screen.getByText("1 of 1 right.")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/^Right\./);
  });

  it("does not take another tonic", async () => {
    const user = userEvent.setup();
    render(<KeyQuiz random={seededRandom(seed)} />);
    const other = answers().find((b) => b.getAttribute("aria-label") !== rightName(question));
    if (!other) throw new Error("no other answer");
    await user.click(other);
    expect(screen.getByText("0 of 1 right.")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/^Not quite\./);
  });
});

describe("KeyQuiz session", () => {
  it("asks every question once before it asks any again", async () => {
    const user = userEvent.setup();
    render(<KeyQuiz random={seededRandom(5)} />);
    const total = allQuestions().length;
    const seen = new Set<string>();
    for (let i = 0; i < total; i++) {
      seen.add(screen.getByText(/^(How many|Which)/).textContent ?? "");
      await user.click(answers()[0] as HTMLElement);
      await user.click(screen.getByRole("button", { name: "Next question" }));
    }
    expect(seen.size).toBe(total);
    expect(screen.getByText(new RegExp(`of ${total} right\\.`))).toBeInTheDocument();
  });
});

describe("KeyQuiz: the link", () => {
  const route = (extra: Partial<QuizRoute> = {}): QuizRoute => ({ page: "quiz", ...extra });

  /** The wording of the questions of the set that `seed` gives with these options, in order. */
  const asked = (seed: number, options = {}) => keyDeck(seed, 0, options).map((q) => wording(q));

  it("puts a seed in a link that has none, replacing the entry", () => {
    const onChange = vi.fn();
    render(<KeyQuiz route={route()} onChange={onChange} />);
    expect(onChange).toHaveBeenCalledTimes(1);
    const [next, options] = onChange.mock.calls[0] as [QuizRoute, { replace?: boolean }];
    expect(next.page).toBe("quiz");
    expect(next.seed).toBeTypeOf("number");
    expect(options).toEqual({ replace: true });
  });

  it("leaves a link that has a seed as it is", () => {
    const onChange = vi.fn();
    render(<KeyQuiz route={route({ seed: 7 })} onChange={onChange} />);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(/^Set 7, 60 questions\./)).toBeInTheDocument();
  });

  it("asks the questions that the seed gives, in order", async () => {
    const user = userEvent.setup();
    render(<KeyQuiz route={route({ seed: 7 })} />);
    const expected = asked(7);
    for (let i = 0; i < 4; i++) {
      expect(screen.getByText(expected[i] as string)).toBeInTheDocument();
      await user.click(answers()[0] as HTMLElement);
      await user.click(screen.getByRole("button", { name: "Next question" }));
    }
  });

  it("asks the same questions again for the same link", () => {
    const first = render(<KeyQuiz route={route({ seed: 11, keys: "minor", upTo: 3 })} />);
    const text = screen.getByText(/^(How many|Which)/).textContent;
    first.unmount();
    render(<KeyQuiz route={route({ seed: 11, keys: "minor", upTo: 3 })} />);
    expect(screen.getByText(/^(How many|Which)/).textContent).toBe(text);
  });

  it("shows what the link asks for", () => {
    render(<KeyQuiz route={route({ seed: 7, keys: "minor", upTo: 2 })} />);
    expect(screen.getByRole("radio", { name: "Minor" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Major" })).not.toBeChecked();
    expect(screen.getByRole("combobox", { name: /Signatures/ })).toHaveValue("2");
    // Five minor keys have two accidentals or fewer, and each is asked both ways.
    expect(screen.getByText(/^Set 7, 10 questions\./)).toBeInTheDocument();
  });

  it("asks only about the keys that were chosen", async () => {
    const user = userEvent.setup();
    const options = { mode: "minor", maxAccidentals: 1 } as const;
    render(<KeyQuiz route={route({ seed: 3, keys: "minor", upTo: 1 })} />);
    const total = keysFor(options).length * 2;
    const allowed = new Set(asked(3, options));
    expect(allowed.size).toBe(total);
    for (let i = 0; i < total; i++) {
      const text = screen.getByText(/^(How many|Which)/).textContent ?? "";
      expect(allowed.has(text)).toBe(true);
      await user.click(answers()[0] as HTMLElement);
      await user.click(screen.getByRole("button", { name: "Next question" }));
    }
  });

  it("goes on with another round of the same set after the last question", async () => {
    const user = userEvent.setup();
    render(<KeyQuiz route={route({ seed: 3, upTo: 0 })} />);
    // C major and A minor, both ways: four questions, then the second round.
    const second = keyDeck(3, 1, { maxAccidentals: 0 }).map(wording);
    for (let i = 0; i < 4; i++) {
      await user.click(answers()[0] as HTMLElement);
      await user.click(screen.getByRole("button", { name: "Next question" }));
    }
    expect(screen.getByText(second[0] as string)).toBeInTheDocument();
  });

  it.each([
    ["Major", { seed: 7, keys: "major" }],
    ["Minor", { seed: 7, keys: "minor" }],
    ["Major and minor", { seed: 7 }],
  ] as const)("links to the %s keys when chosen", async (name, expected) => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <KeyQuiz
        route={route({ seed: 7, keys: name === "Minor" ? "major" : "minor" })}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole("radio", { name }));
    expect(onChange).toHaveBeenLastCalledWith({ page: "quiz", ...expected });
  });

  it("links to a limit when one is chosen, and to none for any number", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<KeyQuiz route={route({ seed: 7, keys: "minor" })} onChange={onChange} />);
    const limit = screen.getByRole("combobox", { name: /Signatures/ });
    await user.selectOptions(limit, "4");
    expect(onChange).toHaveBeenLastCalledWith({ page: "quiz", seed: 7, keys: "minor", upTo: 4 });
    await user.selectOptions(limit, "0");
    expect(onChange).toHaveBeenLastCalledWith({ page: "quiz", seed: 7, keys: "minor", upTo: 0 });
    await user.selectOptions(limit, "7");
    expect(onChange).toHaveBeenLastCalledWith({ page: "quiz", seed: 7, keys: "minor" });
  });

  it("keeps the other choice when one is changed", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<KeyQuiz route={route({ seed: 7, keys: "minor", upTo: 3 })} onChange={onChange} />);
    await user.click(screen.getByRole("radio", { name: "Major" }));
    expect(onChange).toHaveBeenLastCalledWith({ page: "quiz", seed: 7, keys: "major", upTo: 3 });
  });

  it("starts a new set with a new seed and the same choices", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<KeyQuiz route={route({ seed: 7, keys: "minor", upTo: 3 })} onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: "New set" }));
    const [next] = onChange.mock.calls.at(-1) as [QuizRoute];
    expect(next).toMatchObject({ page: "quiz", keys: "minor", upTo: 3 });
    expect(next.seed).toBeTypeOf("number");
  });

  it("starts the score again when the choices change", () => {
    const view = render(<KeyQuiz route={route({ seed: 7 })} />);
    expect(screen.getByText("Nothing answered yet.")).toBeInTheDocument();
    view.rerender(<KeyQuiz route={route({ seed: 7, keys: "major" })} />);
    expect(screen.getByText("Nothing answered yet.")).toBeInTheDocument();
  });
});
