import type { PartId, TutorialId, WireKey } from "../domain/types";
import { wiresAlong } from "../engine/circuit";

/* Einführende Vorführungen. Reine Anzeige: sie lesen die Schaltung, setzen nichts und
   nehmen keine Zeiger an (siehe features/tutorial). Ein Level ruft sie über sein
   Feld `tutorial` auf; die Verweise unten gelten für genau dieses Level und werden in
   content.test.ts gegen es geprüft. */

/** Zieht eine Leitung vor. Jeder Schritt verschwindet, sobald sein Weg verdrahtet ist.
    path = Stützpunkte in Feldkoordinaten, Bruchteile treffen die Anschlüsse.
    need = Leitungen, die dafür liegen müssen. */
export interface DrawWireTutorial {
  kind: "drawWire";
  steps: { text: string; path: [number, number][]; need: WireKey[] }[];
}

/** Zeigt auf einen Schalter, solange das Antippen die Lampe zum Leuchten brächte. */
export interface TapSwitchTutorial {
  kind: "tapSwitch";
  switchId: PartId;
  lampId: PartId;
}

export type TutorialDef = DrawWireTutorial | TapSwitchTutorial;

export const TUTORIALS: Record<TutorialId, TutorialDef> = {
  /* „Schließe den Stromkreis“: Quelle G1 links, Lampe E1 rechts */
  drawWire: {
    kind: "drawWire",
    steps: [
      {
        text: "Halte auf dem + Pol gedrückt und ziehe die Leitung zur Lampe.",
        path: [
          [0, 0.72],
          [0, 0],
          [4, 0],
          [4, 0.75],
        ],
        need: wiresAlong("0,1 0,0 4,0 4,1"),
      },
      {
        text: "Jetzt genauso von der Lampe zurück zum − Pol ziehen.",
        path: [
          [4, 1.25],
          [4, 2],
          [0, 2],
          [0, 1.28],
        ],
        need: wiresAlong("4,1 4,2 0,2 0,1"),
      },
    ],
  },
  /* „Der Schalter“ */
  tapSwitch: { kind: "tapSwitch", switchId: "S1", lampId: "E1" },
};
