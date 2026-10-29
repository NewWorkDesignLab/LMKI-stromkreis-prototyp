import { useCallback, useRef, useState } from "react";
import { emptyHistory, record, redo, undo, type History } from "../../engine/history";

interface State<T> {
  present: T;
  history: History<T>;
}

/** Ergebnis einer Änderung: neuer Wert und ob er in den Verlauf gehört. */
export interface Applied<T> {
  value: T;
  record: boolean;
}

/* Zustand mit Rückgängig/Wiederholen. Die Logik steckt in engine/history.ts, hier nur
   die React-Anbindung und die Gesten-Klammer: begin() merkt sich den Stand vor einer
   Geste, end() trägt ihn als EINEN Eintrag ein, falls sich in der Geste etwas geändert
   hat. So wird ein langer Leitungszug mit einem Strg+Z zurückgenommen.

   `carry` darf beim Zurückspringen Teile des aktuellen Stands übernehmen – hier der
   Bedienzustand der Schalter, der nicht zum Aufbau gehört. */
export function useUndoable<T>(init: () => T, carry: (target: T, from: T) => T = (t) => t) {
  const [state, setState] = useState<State<T>>(() => ({
    present: init(),
    history: emptyHistory<T>(),
  }));
  /* aktueller Stand für begin(): Zeigerereignisse laufen erst nach dem Rendern */
  const live = useRef(state);
  live.current = state;
  const gestureStart = useRef<T | null>(null);
  const carryRef = useRef(carry);
  carryRef.current = carry;

  const apply = useCallback((fn: (present: T) => Applied<T>) => {
    setState((s) => {
      const r = fn(s.present);
      if (r.value === s.present) return s;
      /* Während einer Geste sammelt end() die Änderungen zu einem Eintrag. */
      const rec = r.record && gestureStart.current === null;
      return { present: r.value, history: rec ? record(s.history, s.present) : s.history };
    });
  }, []);

  /** Änderung ohne Verlaufseintrag (Bedienung, Folgezustände der Simulation). */
  const update = useCallback(
    (fn: (present: T) => T) => apply((p) => ({ value: fn(p), record: false })),
    [apply],
  );
  /** Änderung am Aufbau: kommt in den Verlauf. */
  const commit = useCallback(
    (fn: (present: T) => T) => apply((p) => ({ value: fn(p), record: true })),
    [apply],
  );

  const begin = useCallback(() => {
    gestureStart.current = live.current.present;
  }, []);
  const end = useCallback(() => {
    const before = gestureStart.current;
    gestureStart.current = null;
    if (before === null) return;
    setState((s) =>
      s.present === before ? s : { present: s.present, history: record(s.history, before) },
    );
  }, []);

  const step = useCallback((dir: "undo" | "redo") => {
    setState((s) => {
      const r = (dir === "undo" ? undo : redo)(s.history, s.present);
      return r ? { present: carryRef.current(r.present, s.present), history: r.history } : s;
    });
  }, []);

  return {
    present: state.present,
    apply,
    update,
    commit,
    begin,
    end,
    undo: useCallback(() => step("undo"), [step]),
    redo: useCallback(() => step("redo"), [step]),
    canUndo: state.history.past.length > 0,
    canRedo: state.history.future.length > 0,
  };
}
