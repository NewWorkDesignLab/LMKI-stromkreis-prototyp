import type { LevelId } from "../domain/types";
import type { LearningEvent } from "./events";

export interface LevelStats {
  starts: number;
  resets: number;
  solves: number;
  solved: boolean;
  firstSolvedAt?: number;
  lastPlayedAt?: number;
}

const EMPTY: LevelStats = { starts: 0, resets: 0, solves: 0, solved: false };

/* Speicher für den Lernfortschritt. Die Oberfläche kennt nur dieses Interface;
   ein Speicher im Browser (localStorage) oder auf einem Server lässt sich
   einsetzen, ohne etwas anderes anzufassen. */
export interface ProgressStore {
  record(e: LearningEvent): void;
  stats(id: LevelId): LevelStats;
  solvedIds(): LevelId[];
  /** Alle Ereignisse in Reihenfolge, für Bewertung und Auswertung. */
  events(): readonly LearningEvent[];
}

export class MemoryProgressStore implements ProgressStore {
  private log: LearningEvent[] = [];
  private byLevel = new Map<LevelId, LevelStats>();

  record(e: LearningEvent) {
    this.log.push(e);
    const s = { ...this.stats(e.levelId), lastPlayedAt: e.at };
    if (e.type === "level_started") s.starts++;
    else if (e.type === "board_reset") s.resets++;
    else if (e.type === "level_solved") {
      s.solves++;
      s.solved = true;
      s.firstSolvedAt ??= e.at;
    }
    this.byLevel.set(e.levelId, s);
  }
  stats(id: LevelId): LevelStats {
    return this.byLevel.get(id) ?? EMPTY;
  }
  solvedIds(): LevelId[] {
    return [...this.byLevel].filter(([, s]) => s.solved).map(([id]) => id);
  }
  events() {
    return this.log;
  }
}
