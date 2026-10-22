import { useCallback, useEffect, useRef, useState } from "react";
import type { AnswerValue, LevelDef, StepId } from "../../domain/types";
import {
  advance,
  answer,
  complete,
  goTo,
  isLessonDone,
  startLesson,
  stepProgress,
  type Evaluation,
  type LessonState,
} from "../../engine/lesson";
import { useRuntime } from "../../app/RuntimeContext";

/* Ablauf eines Levels in React. Die Regeln stehen in engine/lesson.ts; hier wird nur der
   Zustand gehalten und jede Änderung als Lernereignis gemeldet. Gemeldet wird synchron
   im Handler, nicht in einem Effekt: der letzte Schritt führt direkt ins nächste Level,
   und dann gäbe es keinen Effekt mehr, der das „gelöst“ noch melden könnte. */
export function useLesson(level: LevelDef, hasNextLevel: boolean, onNextLevel: () => void) {
  const rt = useRuntime();
  const [state, setState] = useState<LessonState>(() =>
    startLesson(rt.progress.stats(level.id).solved),
  );
  const ref = useRef(state);
  const started = useRef(new Set<StepId>());

  const startStep = useCallback(
    (s: LessonState) => {
      const st = level.steps[s.index];
      if (st && !started.current.has(st.id)) {
        started.current.add(st.id);
        rt.reportStep(level.id, st.id, "started");
      }
    },
    [rt, level],
  );

  /** Übernimmt einen neuen Zustand und meldet, was sich daran geändert hat. */
  const commit = useCallback(
    (next: LessonState) => {
      const prev = ref.current;
      if (next === prev) return;
      for (const st of level.steps)
        if (stepProgress(next, st.id).done && !stepProgress(prev, st.id).done)
          rt.reportStep(level.id, st.id, "completed");
      if (isLessonDone(level, next) && !isLessonDone(level, prev)) rt.reportSolved(level.id);
      startStep(next);
      ref.current = next;
      setState(next);
    },
    [rt, level, startStep],
  );

  /* Der erste Schritt beginnt mit dem Level. StrictMode ruft Effekte doppelt auf –
     `started` sorgt dafür, dass trotzdem nur einmal gemeldet wird. */
  useEffect(() => startStep(ref.current), [startStep]);

  return {
    state,
    goTo: (i: number) => commit(goTo(level, ref.current, i)),
    /** Schritt erledigt, ohne weiterzugehen (Bauziel erreicht). */
    complete: (id: StepId) => commit(complete(ref.current, id)),
    /* Weiter: erledigt den aktuellen Schritt (Lesen bestätigt) und geht zum nächsten;
       am Ende ins nächste Level, sofern es eines gibt. */
    proceed: () => {
      const cur = level.steps[ref.current.index];
      /* Lesen erledigt sich mit „Weiter“, alles andere nur durch Tun */
      const byReading = cur.kind === "context" || cur.kind === "summary";
      if (!byReading && !stepProgress(ref.current, cur.id).done) return;
      const done = complete(ref.current, cur.id);
      if (ref.current.index < level.steps.length - 1) return commit(advance(level, done));
      commit(done);
      if (hasNextLevel) onNextLevel();
    },
    submit: (id: StepId, value: AnswerValue): Evaluation => {
      const step = level.steps.find((s) => s.id === id);
      const r = answer(ref.current, step, value);
      if (r.evaluation.valid) rt.reportAnswer(level.id, id, value, r.evaluation.correct);
      commit(r.state);
      return r.evaluation;
    },
    reportReset: () => rt.reportReset(level.id),
  };
}
