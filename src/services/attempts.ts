import type { LevelDef } from "../domain/types";
import type { LevelStats } from "./progress";

/* Was nach einem Fehlversuch passiert. Vorgesehen für „nur n Versuche pro Level,
   danach Tipp oder Lösung“. Die Oberfläche wertet die Entscheidung noch nicht
   aus; sie ist der Ort, an dem es später geschieht. */
export type AttemptDecision =
  { action: "continue" } | { action: "reveal_tip"; index: number } | { action: "reveal_solution" };

export interface AttemptPolicy {
  evaluate(stats: LevelStats, level: LevelDef): AttemptDecision;
}

export const unlimitedAttempts: AttemptPolicy = {
  evaluate: () => ({ action: "continue" }),
};
