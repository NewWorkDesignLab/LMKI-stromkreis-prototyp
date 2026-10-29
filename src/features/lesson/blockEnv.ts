import { createContext } from "react";
import type { LevelDef } from "../../domain/types";

/** Was Bausteine über ihren Schritt hinaus wissen müssen: das Level (die Ghost-Schaltung
    zeichnet die Musterlösung eines anderen Schritts) und ob der Rechenweg schon frei ist. */
export interface BlockEnvValue {
  level: LevelDef | null;
  /** Rechenweg zeigen – wie der Lösungsweg einer Frage erst nach dem ersten Versuch */
  showPath: boolean;
}

export const BlockEnv = createContext<BlockEnvValue>({ level: null, showPath: false });
