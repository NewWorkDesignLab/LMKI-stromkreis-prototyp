import { describe, expect, it } from "vitest";
import type { Step } from "../domain/types";
import { validateLevel } from "./validate";

const level = (steps: unknown[]) => ({ id: "test", name: "Test", steps });
const summary = { kind: "summary", id: "merksatz", lesson: "…" };
const errorsOf = (steps: unknown[]) => validateLevel(level(steps)).errors.join("\n");

describe("Prüfung der Schritte", () => {
  it("verlangt mindestens einen Schritt und eindeutige Schritt-IDs", () => {
    expect(validateLevel(level([])).ok).toBe(false);
    expect(errorsOf([summary, summary])).toMatch(/doppelt/);
  });

  it("lässt in Bausteinen nur sichere Adressen zu", () => {
    const ctx = (src: string) => ({
      kind: "context",
      id: "alltag",
      blocks: [{ k: "image", src, alt: "Bild" }],
    });
    expect(errorsOf([ctx("https://example.org/a.png")])).toBe("");
    expect(errorsOf([ctx("javascript:alert(1)")])).toMatch(/Bild/);
  });

  it("kennt nur eingebaute Anschauungen", () => {
    const ctx = { kind: "context", id: "a", blocks: [{ k: "widget", widget: "gibtsnicht" }] };
    expect(errorsOf([ctx])).toMatch(/Anschauung/);
  });

  it("prüft Antworten von Fragen", () => {
    const quiz = (answer: unknown) => ({ kind: "quiz", id: "q", question: "?", answer });
    const choices = [
      { id: "a", text: "A" },
      { id: "b", text: "B" },
    ];
    expect(errorsOf([quiz({ k: "choice", choices, correct: ["a"] })])).toBe("");
    expect(errorsOf([quiz({ k: "choice", choices, correct: ["x"] })])).toMatch(/keine der/);
    expect(errorsOf([quiz({ k: "number", value: 1 })])).toMatch(/unit/);
  });

  it("lässt den Merksatz nur auf eine frühere Vorhersage zurückblicken", () => {
    const predict: Step = {
      kind: "predict",
      id: "vermutung",
      question: "?",
      choices: [
        { id: "a", text: "A" },
        { id: "b", text: "B" },
      ],
    };
    const recall = { ...summary, recall: "vermutung" };
    expect(errorsOf([predict, recall])).toBe("");
    expect(errorsOf([recall, predict])).toMatch(/recall/);
  });

  it("lässt Vorrat nur für Werkzeuge der Palette und als ganze Zahl ab 1 zu", () => {
    const build = (stock: unknown) => ({
      kind: "build",
      id: "bauen",
      W: 3,
      H: 3,
      palette: ["wire", "lamp"],
      task: "…",
      circuit: { parts: {}, wires: {} },
      stock,
    });
    expect(errorsOf([build({ lamp: 2 })])).toBe("");
    expect(errorsOf([build({ motor: 1 })])).toMatch(/Palette/);
    expect(errorsOf([build({ lamp: 0 })])).toMatch(/ganze Zahl/);
  });

  it("lässt eine Ghost-Schaltung nur auf Bauteile der Musterlösung verweisen", () => {
    const lamp = { type: "lamp", x: 1, y: 1, orient: "h" };
    const build = {
      kind: "build",
      id: "bauen",
      W: 3,
      H: 3,
      palette: ["wire"],
      task: "…",
      circuit: { parts: { E1: lamp }, wires: {} },
      solution: { parts: { E1: lamp }, wires: {} },
    };
    const ghost = (labels: Record<string, string>, step = "bauen") => ({
      kind: "context",
      id: "skizze",
      blocks: [{ k: "ghost", step, labels, path: [{ focus: ["E1"], formulas: ["R = 90 Ω"] }] }],
    });
    expect(errorsOf([ghost({ E1: "90 Ω" }), build])).toBe("");
    expect(errorsOf([ghost({ R1: "?" }), build])).toMatch(/R1/);
    expect(errorsOf([ghost({ E1: "90 Ω" }, "gibtsnicht"), build])).toMatch(/solution/);
  });

  it("lässt einen frei einstellbaren Widerstand nur mit gültigem Bereich zu", () => {
    const build = (range: unknown) => ({
      kind: "build",
      id: "bauen",
      W: 3,
      H: 3,
      palette: ["wire"],
      task: "…",
      circuit: { parts: { R1: { type: "resistor", x: 1, y: 1, r: 100, range } }, wires: {} },
    });
    expect(errorsOf([build({ min: 1, max: 1000 })])).toBe("");
    expect(errorsOf([build({ min: 200, max: 1000 })])).toMatch(/außerhalb/);
    expect(errorsOf([build({ min: 0, max: 1000 })])).toMatch(/min < max/);
  });

  it("kennt für Kennwerte nur ratings und meldet das frühere showValues", () => {
    const build = (extra: Record<string, unknown>) => ({
      kind: "build",
      id: "bauen",
      W: 3,
      H: 3,
      palette: ["wire"],
      task: "…",
      circuit: { parts: {}, wires: {} },
      ...extra,
    });
    expect(errorsOf([build({ ratings: "resistance" })])).toBe("");
    expect(errorsOf([build({ ratings: "alles" })])).toMatch(/ratings/);
    expect(errorsOf([build({ showValues: true })])).toMatch(/showValues/);
  });

  it("kennt keine fremden Schrittarten", () => {
    expect(errorsOf([{ kind: "tanz", id: "x" }])).toMatch(/unbekannte Art/);
  });
});
