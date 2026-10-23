import type { BuildStep, LevelDef } from "../../domain/types";
import { BASE, wires } from "../helpers";

/* Vorführlevel ohne Lerninhalt: zeigen, wie Bretter verschiedener Größe dargestellt
   werden (Startmaßstab, Zoom, Verschieben). Jedes Brett trägt dieselbe Aufgabe – Quelle
   und Lampe an gegenüberliegenden Rändern, verbunden über den Brettrand –, damit nur die
   Größe sich unterscheidet. Nach der Prüfung wieder entfernen. */

function demoLevel(id: string, name: string, W: number, H: number): LevelDef {
  const yG = Math.floor(H / 2);
  const parts: BuildStep["circuit"]["parts"] = {
    G1: { type: "battery", x: 0, y: yG, orient: "v" },
    E1: { type: "lamp", x: W - 1, y: H - 1 - yG, orient: "v" },
  };
  const r = W - 1,
    b = H - 1;
  return {
    id,
    name,
    steps: [
      {
        kind: "build",
        id: "bauen",
        task: `Brett ${W} × ${H} Punkte: Verbinde Quelle und Lampe zu einem geschlossenen Stromkreis.`,
        W,
        H,
        palette: BASE,
        circuit: { parts, wires: {} },
        solution: {
          parts,
          wires: wires([`0,${yG} 0,0 ${r},0 ${r},${b} 0,${b} 0,${yG}`]),
        },
      },
    ],
  };
}

export const brettgroessenLevels: LevelDef[] = [
  demoLevel("demo-brett-klein", "Demo: Kleines Brett", 3, 3),
  demoLevel("demo-brett-breit", "Demo: Breites Brett", 24, 8),
  demoLevel("demo-brett-maximal", "Demo: Größtes Brett", 40, 40),
];
