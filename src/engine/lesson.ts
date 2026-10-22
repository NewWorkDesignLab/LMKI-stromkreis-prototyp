/* Ablauf eines Levels als reine Funktionen: welcher Schritt aktiv ist, welche erledigt
   sind, wohin man springen darf und wie eine Antwort ausfällt. Die Oberfläche hält nur
   den Zustand und meldet Ereignisse; die Regeln stehen hier und sind getestet. */
import type { AnswerSpec, AnswerValue, LevelDef, Step, StepId } from "../domain/types";
import { parseQuantity, withinTolerance } from "./quantity";

export interface StepProgress {
  done: boolean;
  /** abgegebene Antworten (Quiz, Vorhersage) */
  attempts: number;
  answer?: AnswerValue;
  /** letzte Antwort richtig; bei Vorhersagen ohne `correct` nicht gesetzt */
  correct?: boolean;
}

export interface LessonState {
  /** angezeigter Schritt */
  index: number;
  progress: Record<StepId, StepProgress>;
  /** alle Schritte frei, etwa weil das Level früher schon gelöst wurde */
  open: boolean;
}

const FRESH: StepProgress = { done: false, attempts: 0 };

export const startLesson = (open = false): LessonState => ({ index: 0, progress: {}, open });

export const stepProgress = (s: LessonState, id: StepId): StepProgress => s.progress[id] ?? FRESH;

/** Erster unerledigter Schritt, oder die Anzahl der Schritte, wenn alles erledigt ist. */
export function frontier(level: Pick<LevelDef, "steps">, s: LessonState): number {
  const i = level.steps.findIndex((st) => !stepProgress(s, st.id).done);
  return i < 0 ? level.steps.length : i;
}

/* Erreichbar ist alles bis einschließlich des ersten unerledigten Schritts: Zurückblättern
   geht immer, vorblättern nur über Erledigtes. */
export function isReachable(level: Pick<LevelDef, "steps">, s: LessonState, i: number): boolean {
  if (i < 0 || i >= level.steps.length) return false;
  return s.open || i <= frontier(level, s);
}

export function goTo(level: Pick<LevelDef, "steps">, s: LessonState, i: number): LessonState {
  return isReachable(level, s, i) && i !== s.index ? { ...s, index: i } : s;
}

/** Weiter zum nächsten Schritt – nur wenn der aktuelle erledigt ist. */
export function advance(level: Pick<LevelDef, "steps">, s: LessonState): LessonState {
  const cur = level.steps[s.index];
  if (!cur || !stepProgress(s, cur.id).done) return s;
  return goTo(level, s, s.index + 1);
}

const patch = (s: LessonState, id: StepId, p: Partial<StepProgress>): LessonState => ({
  ...s,
  progress: { ...s.progress, [id]: { ...stepProgress(s, id), ...p } },
});

/** Markiert einen Schritt als erledigt (Lesen bestätigt, Bauziel erreicht). */
export function complete(s: LessonState, id: StepId): LessonState {
  return stepProgress(s, id).done ? s : patch(s, id, { done: true });
}

export const isLessonDone = (level: Pick<LevelDef, "steps">, s: LessonState) =>
  level.steps.length > 0 && frontier(level, s) === level.steps.length;

/* ---------- Antworten ---------- */

export type Evaluation =
  /** ausgewertet; correct = null bei einer Vorhersage ohne festgelegte Auflösung */
  | { valid: true; correct: boolean | null }
  /** nicht auswertbar (keine Zahl, falsche Einheit) – zählt nicht als Versuch */
  | { valid: false; error: string };

const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && a.every((x) => b.includes(x));

export function evaluate(spec: AnswerSpec, value: AnswerValue): Evaluation {
  if (spec.k === "choice") {
    if (value.k !== "choice" || !value.ids.length)
      return { valid: false, error: "Bitte eine Antwort wählen." };
    return { valid: true, correct: sameSet(value.ids, spec.correct) };
  }
  if (value.k !== "number") return { valid: false, error: "Bitte eine Zahl eingeben." };
  const p = parseQuantity(value.text, spec.unit);
  if ("error" in p) return { valid: false, error: p.error };
  return { valid: true, correct: withinTolerance(p.value, spec.value, spec.tolerance) };
}

/* Antwort auf einen Schritt. Quiz: erledigt erst bei richtiger Antwort, jeder gültige
   Versuch zählt. Vorhersage: erledigt mit der ersten Wahl, ausdrücklich ohne Urteil –
   sie wird erst im Merksatz aufgelöst. Ungültige Eingaben ändern nichts. */
export function answer(
  s: LessonState,
  step: Step,
  value: AnswerValue,
): { state: LessonState; evaluation: Evaluation } {
  const prev = stepProgress(s, step.id);
  /* Eine Vorhersage ist eine Festlegung: nachträglich ändern hieße, sie nach dem
     Ausprobieren zu schönen. */
  if (step.kind === "predict" && prev.done)
    return { state: s, evaluation: { valid: false, error: "Die Vermutung steht schon fest." } };
  let evaluation: Evaluation;
  if (step.kind === "quiz") evaluation = evaluate(step.answer, value);
  else if (step.kind === "predict") {
    const e = evaluate({ k: "choice", choices: step.choices, correct: [] }, value);
    evaluation = !e.valid
      ? e
      : {
          valid: true,
          correct: step.correct
            ? value.k === "choice" && value.ids.length === 1 && value.ids[0] === step.correct
            : null,
        };
  } else
    return { state: s, evaluation: { valid: false, error: "Dieser Schritt hat keine Frage." } };
  if (!evaluation.valid) return { state: s, evaluation };
  const done = prev.done || step.kind === "predict" || evaluation.correct === true;
  const state = patch(s, step.id, {
    attempts: prev.attempts + 1,
    answer: value,
    done,
    ...(evaluation.correct !== null && { correct: evaluation.correct }),
  });
  return { state, evaluation };
}
