import type { LevelDef } from "../../domain/types";
import { BASE, wires } from "../helpers";

/* Level im heutigen Format (Schritte, Bauteil-IDs, Leitungen als Kanten). Das erste
   ist zugleich die Vorlage: es nutzt jede Schrittart einmal und bringt eine
   Musterlösung mit, gegen die content.test.ts die Ziele prüft. */
export const beispielLevels: LevelDef[] = [
  {
    id: "lichterkette-in-reihe",
    name: "Die Lichterkette",
    concepts: ["reihenschaltung", "spannungsteilung"],
    steps: [
      {
        kind: "context",
        id: "alltag",
        title: "Alltag",
        heading: "Ein Lämpchen kaputt – alle aus",
        blocks: [
          {
            k: "p",
            text: "Bei älteren Lichterketten ging die ganze Kette aus, sobald ein einziges Lämpchen durchgebrannt war.",
          },
          {
            k: "p",
            text: "Der Grund: Die Lämpchen sind in Reihe geschaltet. Der Strom fließt nacheinander durch jedes einzelne – fehlt eines, ist der Stromkreis unterbrochen.",
          },
        ],
      },
      {
        kind: "predict",
        id: "vermutung",
        question:
          "Zwei gleiche Lampen in Reihe an derselben Quelle: Wie hell leuchtet jede im Vergleich zu einer Lampe allein?",
        choices: [
          { id: "heller", text: "Heller" },
          { id: "gleich", text: "Genauso hell" },
          { id: "dunkler", text: "Dunkler" },
        ],
        correct: "dunkler",
      },
      {
        kind: "build",
        id: "bauen",
        task: "Schalte beide Lampen in Reihe an die Spannungsquelle. Wie groß ist die Stromstärke?",
        W: 7,
        H: 4,
        palette: BASE,
        ratings: "resistance",
        circuit: {
          parts: {
            G1: { type: "battery", x: 0, y: 1, orient: "v" },
            E1: { type: "lamp", x: 2, y: 0, orient: "h" },
            E2: { type: "lamp", x: 4, y: 0, orient: "h" },
            PA1: { type: "ammeter", x: 3, y: 2, orient: "h" },
          },
          wires: {},
        },
        goals: [
          {
            k: "measure",
            id: "strom",
            quantity: "current",
            of: "E1",
            unit: "mA",
            label: "Miss die Stromstärke",
          },
        ],
        solution: {
          parts: {
            G1: { type: "battery", x: 0, y: 1, orient: "v" },
            E1: { type: "lamp", x: 2, y: 0, orient: "h" },
            E2: { type: "lamp", x: 4, y: 0, orient: "h" },
            PA1: { type: "ammeter", x: 3, y: 2, orient: "h" },
          },
          wires: wires(["0,1 0,0 6,0 6,2 0,2 0,1"]),
        },
      },
      {
        kind: "quiz",
        id: "spannung",
        title: "Frage",
        concepts: ["spannungsteilung"],
        question: "Berechne die Spannung an einer der beiden Lampen.",
        blocks: [{ k: "p", text: "Die Quelle liefert 9 V, beide Lampen haben je 90 Ω." }],
        answer: { k: "number", value: 4.5, unit: "V", tolerance: 0.03 },
        explanation: [
          {
            k: "p",
            text: "Durch beide Lampen fließt derselbe Strom. Weil sie gleich sind, fällt an jeder dieselbe Spannung ab – sie teilen sich die 9 V.",
          },
          { k: "formula", text: "U = 9 V / 2 = 4,5 V" },
        ],
      },
      {
        kind: "summary",
        id: "merksatz",
        lesson:
          "In Reihe teilen sich die Lampen die Spannung der Quelle. Jede bekommt weniger als allein – deshalb leuchten sie dunkler, und fällt eine aus, ist der ganze Kreis unterbrochen.",
        recall: "vermutung",
      },
    ],
  },
];
