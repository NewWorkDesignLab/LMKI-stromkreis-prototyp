import { describe, expect, it } from "vitest";
import type { LevelDef, PredictStep, QuizStep } from "../domain/types";
import {
  advance,
  answer,
  complete,
  evaluate,
  goTo,
  isLessonDone,
  isReachable,
  startLesson,
} from "./lesson";
import { parseQuantity } from "./quantity";

const predict: PredictStep = {
  kind: "predict",
  id: "vermutung",
  question: "Heller oder dunkler?",
  choices: [
    { id: "h", text: "heller" },
    { id: "d", text: "dunkler" },
  ],
  correct: "d",
};
const quiz: QuizStep = {
  kind: "quiz",
  id: "rechnen",
  question: "Wie groß ist R?",
  answer: { k: "number", value: 220, unit: "Ω" },
};
const level: Pick<LevelDef, "steps"> = {
  steps: [
    { kind: "context", id: "alltag", blocks: [{ k: "p", text: "…" }] },
    predict,
    quiz,
    { kind: "summary", id: "merksatz", lesson: "…", recall: "vermutung" },
  ],
};

describe("Ablauf", () => {
  it("lässt nur bis zum ersten unerledigten Schritt springen", () => {
    const s = startLesson();
    expect(isReachable(level, s, 0)).toBe(true);
    expect(isReachable(level, s, 1)).toBe(false);
    expect(goTo(level, s, 2)).toBe(s);
    const s2 = complete(s, "alltag");
    expect(isReachable(level, s2, 1)).toBe(true);
    expect(isReachable(level, s2, 2)).toBe(false);
  });

  it("öffnet alle Schritte, wenn das Level schon gelöst war", () => {
    expect(isReachable(level, startLesson(true), 3)).toBe(true);
  });

  it("geht erst weiter, wenn der aktuelle Schritt erledigt ist", () => {
    const s = startLesson();
    expect(advance(level, s)).toBe(s);
    expect(advance(level, complete(s, "alltag")).index).toBe(1);
  });

  it("ist fertig, wenn alle Schritte erledigt sind", () => {
    let s = startLesson();
    for (const id of ["alltag", "vermutung", "rechnen"]) s = complete(s, id);
    expect(isLessonDone(level, s)).toBe(false);
    expect(isLessonDone(level, complete(s, "merksatz"))).toBe(true);
  });
});

describe("Antworten", () => {
  it("erledigt eine Vorhersage sofort, merkt sich aber, ob sie stimmte", () => {
    const r = answer(startLesson(), predict, { k: "choice", ids: ["h"] });
    expect(r.evaluation).toEqual({ valid: true, correct: false });
    expect(r.state.progress.vermutung).toMatchObject({ done: true, correct: false, attempts: 1 });
  });

  it("lässt eine festgehaltene Vorhersage nicht nachträglich ändern", () => {
    const s = answer(startLesson(), predict, { k: "choice", ids: ["h"] }).state;
    const r = answer(s, predict, { k: "choice", ids: ["d"] });
    expect(r.state).toBe(s);
    expect(r.evaluation.valid).toBe(false);
  });

  it("erledigt eine Quizfrage erst mit der richtigen Antwort und zählt die Versuche", () => {
    let r = answer(startLesson(), quiz, { k: "number", text: "300" });
    expect(r.state.progress.rechnen).toMatchObject({ done: false, attempts: 1, correct: false });
    r = answer(r.state, quiz, { k: "number", text: "0,22 kΩ" });
    expect(r.state.progress.rechnen).toMatchObject({ done: true, attempts: 2, correct: true });
  });

  it("zählt unlesbare Eingaben nicht als Versuch", () => {
    const s = startLesson();
    const r = answer(s, quiz, { k: "number", text: "zwei" });
    expect(r.state).toBe(s);
    expect(r.evaluation.valid).toBe(false);
  });

  it("verlangt bei Mehrfachauswahl genau die richtigen Antworten", () => {
    const spec = {
      k: "choice" as const,
      choices: [
        { id: "a", text: "A" },
        { id: "b", text: "B" },
        { id: "c", text: "C" },
      ],
      correct: ["a", "c"],
    };
    expect(evaluate(spec, { k: "choice", ids: ["c", "a"] })).toEqual({
      valid: true,
      correct: true,
    });
    expect(evaluate(spec, { k: "choice", ids: ["a"] })).toEqual({ valid: true, correct: false });
  });
});

describe("Zahleneingaben", () => {
  it("versteht Komma, Vorsätze und Schreibweisen der Einheit", () => {
    expect(parseQuantity("220", "Ω")).toEqual({ value: 220 });
    expect(parseQuantity("220,5 Ohm", "Ω")).toEqual({ value: 220.5 });
    expect(parseQuantity("0,22kΩ", "Ω")).toEqual({ value: 220 });
    expect(parseQuantity("0,22 k", "Ω")).toEqual({ value: 220 });
    expect(parseQuantity("29 mA", "A")).toEqual({ value: 0.029 });
  });

  it("weist falsche Einheiten und Nicht-Zahlen ab", () => {
    expect(parseQuantity("29 mV", "A")).toHaveProperty("error");
    expect(parseQuantity("viel", "A")).toHaveProperty("error");
  });

  it("wertet mit Toleranz aus", () => {
    const spec = { k: "number" as const, value: 220, unit: "Ω", tolerance: 0.01 };
    expect(evaluate(spec, { k: "number", text: "220,34" })).toEqual({ valid: true, correct: true });
    expect(evaluate(spec, { k: "number", text: "230" })).toEqual({ valid: true, correct: false });
  });
});
