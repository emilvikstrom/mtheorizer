import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  type KeyQuestion,
  allQuestions,
  formatKey,
  formatNote,
  newDeck,
  seededRandom,
  signatureOf,
} from "../theory";
import { KeyQuiz, describeSignature } from "./KeyQuiz";

/** The questions of the session that `seed` gives, in the order they are asked. */
const sessionOf = (seed: number) => newDeck(seededRandom(seed));

const seedWith = (type: "count" | "find") => {
  for (let seed = 1; seed < 100; seed++) if (sessionOf(seed)[0]?.type === type) return seed;
  throw new Error("no seed");
};

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
    expect(screen.getAllByRole("button")).toHaveLength(15);
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
    expect(screen.getAllByRole("button")).toHaveLength(15);
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
    const other = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("aria-label") !== rightName(question));
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
      await user.click(screen.getAllByRole("button")[0] as HTMLElement);
      await user.click(screen.getByRole("button", { name: "Next question" }));
    }
    expect(seen.size).toBe(total);
    expect(screen.getByText(new RegExp(`of ${total} right\\.`))).toBeInTheDocument();
  });
});
