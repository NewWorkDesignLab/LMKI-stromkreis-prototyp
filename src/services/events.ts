import type { LevelId } from "../domain/types";

/* Alles, was die Lernenden tun und die Bewertung später braucht, als Ereignisse.
   Die Oberfläche meldet sie, Fortschritt, Bewertung und API hören mit. */
export type LearningEvent =
  | { type: "level_started"; levelId: LevelId; at: number }
  | { type: "board_reset"; levelId: LevelId; at: number }
  | { type: "level_solved"; levelId: LevelId; at: number }
  | { type: "level_left"; levelId: LevelId; at: number; solved: boolean };

export type Unsubscribe = () => void;

/** Kleiner Ereignisverteiler; der Fehler eines Hörers darf die anderen nicht aufhalten. */
export class EventBus<T> {
  private listeners = new Set<(e: T) => void>();
  on(listener: (e: T) => void): Unsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  emit(e: T) {
    for (const l of [...this.listeners]) {
      try {
        l(e);
      } catch (err) {
        console.error("[stromkreis] Ereignis-Hörer fehlgeschlagen", err);
      }
    }
  }
}
