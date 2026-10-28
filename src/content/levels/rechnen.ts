import type { Circuit, LevelDef } from "../../domain/types";
import { BASE, points, wires } from "../helpers";

/* Rechenlevel im heutigen Format: Sie brauchen die Musterlösung, weil die Ghost-Schaltung
   im Rechenschritt sie zeichnet. Reihenfolge und Kapitelzuordnung stehen in ../curriculum.ts. */

/* Werte so gewählt, dass die Rechnung glatt aufgeht (9 V / 25 mA = 360 Ω, 360 Ω − 90 Ω =
   270 Ω, ein Normwert der E12-Reihe): Das Level lehrt das Ohmsche Gesetz, nicht das Runden. */
const ohmParts = (r: number): Circuit["parts"] => ({
  G1: { type: "battery", x: 0, y: 1, orient: "v" },
  /* frei eintragbar zwischen 1 Ω und 10 kΩ: nur positive Werte, die in diesem Kreis
     sinnvoll sind; der Startwert verrät nichts */
  R1: { type: "resistor", x: 2, y: 0, orient: "h", r, range: { min: 1, max: 10000 } },
  PA1: { type: "ammeter", x: 4, y: 0, orient: "h" },
  E1: { type: "lamp", x: 6, y: 1, orient: "v" },
});

export const rechnenLevels: LevelDef[] = [
  {
    id: "ohmsches-gesetz",
    name: "Ohmsches Gesetz",
    concepts: ["ohmsches-gesetz", "widerstand"],
    steps: [
      {
        kind: "quiz",
        id: "rechnen",
        title: "Rechnen",
        concepts: ["ohmsches-gesetz"],
        question:
          "Berechne mit Hilfe des Ohmschen Gesetzes, wie groß der Vorwiderstand sein muss, damit eine Stromstärke von 25 mA fließt.",
        blocks: [
          {
            k: "ghost",
            step: "bauen",
            labels: { G1: "U = 9 V", E1: "R_L = 90 Ω", PA1: "I = 25 mA", R1: "R_V = ?" },
            wanted: "R1",
            /* Der Rechenweg erscheint erst nach dem ersten Versuch, damit er nicht
               überlesen, sondern angewendet wird. */
            path: [
              {
                focus: ["G1", "R1", "PA1", "E1"],
                text: "Der Strom fließt durch die ganze Schaltung. Aus Spannung und Stromstärke folgt der Gesamtwiderstand.",
                formulas: ["I = 25 mA = 0,025 A", "R_ges = U / I = 9 V / 0,025 A = 360 Ω"],
              },
              {
                focus: ["E1"],
                text: "Davon hat die Lampe schon 90 Ω.",
                formulas: ["R_L = 90 Ω"],
              },
              {
                focus: ["R1"],
                text: "Der Vorwiderstand bekommt den Rest.",
                formulas: ["R_V = R_ges − R_L = 360 Ω − 90 Ω = 270 Ω"],
              },
              {
                focus: ["G1", "R1", "PA1", "E1"],
                text: "Probe",
                formulas: ["I = U / (R_L + R_V) = 9 V / 360 Ω = 0,025 A = 25 mA"],
              },
            ],
          },
          {
            k: "p",
            text: "Gegeben sind eine Spannung von 9 V und eine Lampe mit einem Widerstand von 90 Ω. Gesucht ist der Vorwiderstand.",
          },
          { k: "widget", widget: "uri-dreieck" },
        ],
        answer: { k: "number", value: 270, unit: "Ω", tolerance: 0 },
      },
      {
        kind: "build",
        id: "bauen",
        task: "Verdrahte den Stromkreis, stelle am Vorwiderstand deinen berechneten Wert ein und überprüfe die Stromstärke am Amperemeter.",
        W: 7,
        H: 3,
        palette: BASE,
        showValues: true,
        walls: points("1,1 2,1 3,1 4,1 5,1"),
        circuit: { parts: ohmParts(100), wires: {} },
        goals: [
          {
            k: "read",
            type: "ammeter",
            /* Das Amperemeter zeigt ganze mA: alles, was als „25 mA“ erscheint */
            min: 0.0245,
            max: 0.025499999,
            label: "Die Stromstärke beträgt 25 mA",
          },
        ],
        solution: { parts: ohmParts(270), wires: wires(["0,1 0,0 6,0 6,2 0,2 0,1"]) },
      },
      {
        kind: "summary",
        id: "merksatz",
        lesson:
          "R = U / I. Der Gesamtwiderstand einer Reihenschaltung ist die Summe aller Widerstände.",
      },
    ],
  },
];
