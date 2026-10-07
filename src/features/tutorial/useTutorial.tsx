import { useMemo, type ReactNode } from "react";
import type { Grid, LevelDef } from "../../domain/types";
import { simulate } from "../../engine/simulate";
import { TUTORIALS } from "../../content/tutorials";
import { TutorialClick, TutorialRoute } from "./TutorialOverlays";

interface Args {
  level: LevelDef;
  grid: Grid;
  won: boolean;
  /** Spielerin zeichnet gerade, ein Dialog ist offen o. Ä. – dann zeigt die Einführung nichts.
      Solange man selbst zeichnet, soll die eigene Leitung die einzige bewegte Markierung sein. */
  suppressed: boolean;
}

/* Liefert das SVG-Element der Einführung für das aktuelle Brett oder null.
   Der Fortschritt ergibt sich aus dem Brett, also gehen Zeichnen und Löschen
   in beliebiger Reihenfolge. */
export function useTutorial({ level, grid, won, suppressed }: Args): ReactNode {
  const def = level.tutorial ? TUTORIALS[level.tutorial] : undefined;

  const stepIndex =
    def?.kind === "drawWire" && !won
      ? def.steps.findIndex((s) => !s.need.every((k) => grid[k]?.type === "wire"))
      : -1;

  const tapSwitch = useMemo(() => {
    if (def?.kind !== "tapSwitch" || won) return false;
    const sw = grid[def.switchAt];
    if (sw?.type !== "switch" || sw.closed) return false;
    // Vorschau: Schalter schließen, ohne das Brett der Spielerin anzufassen.
    const connected = simulate({ ...grid, [def.switchAt]: { ...sw, closed: true } });
    return !connected.short && connected.lit.has(def.lampAt);
  }, [def, won, grid]);

  if (suppressed || !def) return null;
  if (def.kind === "tapSwitch" && tapSwitch) {
    const [x, y] = def.switchAt.split(",").map(Number);
    return <TutorialClick x={x} y={y} />;
  }
  if (def.kind === "drawWire" && stepIndex >= 0)
    return <TutorialRoute key={stepIndex} step={def.steps[stepIndex]} moving />;
  return null;
}
