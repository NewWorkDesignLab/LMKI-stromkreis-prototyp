/* Verlauf für Rückgängig/Wiederholen. Generisch und rein: gespeichert werden ganze
   Zustände, nicht Differenzen – die Schaltungen sind klein und werden ohnehin nie
   verändert, nur ersetzt, also teilen sich aufeinanderfolgende Stände fast alles. */

export interface History<T> {
  readonly past: readonly T[];
  readonly future: readonly T[];
}

export const emptyHistory = <T>(): History<T> => ({ past: [], future: [] });

/** Reicht für eine lange Bausitzung, ohne dass der Speicher unbegrenzt wächst. */
export const HISTORY_LIMIT = 200;

/** Merkt sich den Stand vor einer Änderung. Eine neue Änderung verwirft das Wiederholbare. */
export function record<T>(h: History<T>, before: T, limit = HISTORY_LIMIT): History<T> {
  const past = [...h.past, before];
  return { past: past.length > limit ? past.slice(past.length - limit) : past, future: [] };
}

export function undo<T>(h: History<T>, present: T): { history: History<T>; present: T } | null {
  if (!h.past.length) return null;
  return {
    history: { past: h.past.slice(0, -1), future: [present, ...h.future] },
    present: h.past[h.past.length - 1],
  };
}

export function redo<T>(h: History<T>, present: T): { history: History<T>; present: T } | null {
  if (!h.future.length) return null;
  return {
    history: { past: [...h.past, present], future: h.future.slice(1) },
    present: h.future[0],
  };
}
