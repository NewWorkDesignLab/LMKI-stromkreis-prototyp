import type { CellKey, TutorialId } from "../domain/types";

/* Einführende Vorführungen. Reine Anzeige: sie lesen das Feld, setzen nichts und
   nehmen keine Zeiger an (siehe features/tutorial). Ein Level ruft sie über sein
   Feld `tutorial` auf. */

/** Zieht eine Leitung vor. Jeder Schritt verschwindet, sobald sein Weg verdrahtet ist.
    path = Stützpunkte in Feldkoordinaten, Bruchteile treffen die Anschlüsse.
    need = Zellen, die dafür Leitung sein müssen. */
export interface DrawWireTutorial {
  kind: "drawWire";
  steps: { text: string; path: [number, number][]; need: CellKey[] }[];
}

/** Zeigt auf einen Schalter, solange das Antippen die Lampe zum Leuchten brächte. */
export interface TapSwitchTutorial {
  kind: "tapSwitch";
  switchAt: CellKey;
  lampAt: CellKey;
}

export type TutorialDef = DrawWireTutorial | TapSwitchTutorial;

export const TUTORIALS: Record<TutorialId, TutorialDef> = {
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
        need: ["0,0", "1,0", "2,0", "3,0", "4,0"],
      },
      {
        text: "Jetzt genauso von der Lampe zurück zum − Pol ziehen.",
        path: [
          [4, 1.25],
          [4, 2],
          [0, 2],
          [0, 1.28],
        ],
        need: ["0,2", "1,2", "2,2", "3,2", "4,2"],
      },
    ],
  },
  tapSwitch: { kind: "tapSwitch", switchAt: "2,0", lampAt: "4,1" },
};
