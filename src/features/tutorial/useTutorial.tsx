import { useMemo, type ReactNode } from "react";
import type { BuildStep, Circuit } from "../../domain/types";
import { simulate } from "../../engine/simulate";
import { TUTORIALS } from "../../content/tutorials";
import { TutorialClick, TutorialRoute } from "./TutorialOverlays";

interface Args {
  level: BuildStep;
  circuit: Circuit;
  won: boolean;
  /** Spielerin zeichnet gerade, ein Dialog ist offen o. Ä. – dann zeigt die Einführung nichts.
      Solange man selbst zeichnet, soll die eigene Leitung die einzige bewegte Markierung sein. */
  suppressed: boolean;
}

/* Liefert das SVG-Element der Einführung für das aktuelle Brett oder null.
   Der Fortschritt ergibt sich aus der Schaltung, also gehen Zeichnen und Löschen
   in beliebiger Reihenfolge. */
export function useTutorial({ level, circuit, won, suppressed }: Args): ReactNode {
  const def = level.tutorial ? TUTORIALS[level.tutorial] : undefined;

  const stepIndex =
    def?.kind === "drawWire" && !won
      ? def.steps.findIndex((s) => !s.need.every((k) => circuit.wires[k]))
      : -1;

  const tapSwitch = useMemo(() => {
    if (def?.kind !== "tapSwitch" || won) return false;
    const sw = circuit.parts[def.switchId];
    if (sw?.type !== "switch" || sw.closed) return false;
    // Vorschau: Schalter schließen, ohne die Schaltung der Spielerin anzufassen.
    const connected = simulate({
      ...circuit,
      parts: { ...circuit.parts, [def.switchId]: { ...sw, closed: true } },
    });
    return !connected.short && connected.lit.has(def.lampId);
  }, [def, won, circuit]);

  if (suppressed || !def) return null;
  if (def.kind === "tapSwitch" && tapSwitch) {
    const { x, y } = circuit.parts[def.switchId];
    return <TutorialClick x={x} y={y} />;
  }
  if (def.kind === "drawWire" && stepIndex >= 0)
    return <TutorialRoute key={stepIndex} step={def.steps[stepIndex]} moving />;
  return null;
}
