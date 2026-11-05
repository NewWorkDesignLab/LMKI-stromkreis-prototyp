import type { Circuit, LevelDef } from "../../domain/types";
import { BASE, kreuzschalter, wires } from "../helpers";

/* Demo: Kreuzschaltung, nur intern zum Ausprobieren (Kapitel „Demo“ im Lehrplan).
   Der Kreuzschalter ist ein fest verdrahteter Block aus zwei gekoppelten Wechselschaltern
   und einer Kreuzung (siehe kreuzschalter in ../helpers). Zu verlegen sind nur die beiden
   Paare korrespondierender Leitungen; Zuleitung, Lampe und Rückleitung liegen fest. */

const block = kreuzschalter(5, 0, { a: "S3", b: "S4", cross: "X1", link: "K1" });

const parts: Circuit["parts"] = {
  G1: { type: "battery", x: 0, y: 3, orient: "v" },
  S1: { type: "spdt", x: 2, y: 2, dir: "W", pos: 0, name: "EG" },
  S2: { type: "spdt", x: 10, y: 2, dir: "E", pos: 0, name: "2. OG" },
  E1: { type: "lamp", x: 12, y: 3, orient: "v" },
  ...block.parts,
};

const fest = {
  ...block.wires,
  ...wires(["0,3 0,2 2,2", "10,2 12,2 12,3", "12,3 12,6 0,6 0,3"], { lock: true }),
};

export const kreuzschaltungLevels: LevelDef[] = [
  {
    id: "die-kreuzschaltung",
    name: "Die Kreuzschaltung",
    concepts: ["kreuzschaltung", "wechselschalter"],
    steps: [
      {
        kind: "context",
        id: "alltag",
        title: "Alltag",
        heading: "Licht im Treppenhaus",
        blocks: [
          {
            k: "p",
            text: "Im Treppenhaus soll sich das Licht auf jeder Etage ein- und ausschalten lassen – im Erdgeschoss, im 1. und im 2. Obergeschoss.",
          },
          {
            k: "p",
            text: "Mit zwei Schaltstellen geht das mit der Wechselschaltung. Hier sind es drei.",
          },
        ],
      },
      {
        kind: "predict",
        id: "vermutung",
        question: "Reicht für die dritte Schaltstelle ein weiterer Wechselschalter?",
        choices: [
          { id: "ja", text: "Ja, ein dritter Wechselschalter genügt" },
          { id: "nein", text: "Nein, dafür braucht es ein anderes Bauteil" },
        ],
        correct: "nein",
      },
      {
        kind: "build",
        id: "bauen",
        task: "Treppenhaus: Verbinde beide Wechselschalter über je zwei korrespondierende Leitungen mit dem Kreuzschalter, sodass jeder der drei Schalter das Licht ein- und ausschalten kann.",
        W: 13,
        H: 7,
        palette: BASE,
        circuit: { parts, wires: fest },
        frames: [{ ...block.frame, label: "Kreuzschalter 1. OG" }],
        goals: [
          {
            k: "toggle",
            at: "E1",
            /* S3 steht für den Kreuzschalter; sein Partner S4 springt mit */
            inputs: ["S1", "S3", "S2"],
            label: "Jeder Schalter schaltet das Licht um",
          },
        ],
        solution: {
          parts,
          wires: {
            ...fest,
            ...wires([
              `2,2 2,1 ${block.ports.a}`,
              `2,2 2,4 ${block.ports.b}`,
              `${block.ports.c} 10,0 10,2`,
              `${block.ports.d} 10,3 10,2`,
            ]),
          },
        },
      },
      {
        kind: "summary",
        id: "merksatz",
        lesson:
          "Für jede weitere Schaltstelle kommt ein Kreuzschalter zwischen die beiden Wechselschalter. Er vertauscht beim Betätigen die korrespondierenden Leitungen.",
        blocks: [
          {
            k: "p",
            text: "Wie in „Die Wechselschaltung“ leuchtet die Lampe, wenn beide Wechselschalter auf dieselbe Leitung geschaltet sind. Der Kreuzschalter führt die beiden Leitungen entweder gerade durch oder über Kreuz weiter. Jede Betätigung tauscht sie gegeneinander aus – deshalb kehrt jeder der drei Schalter den Zustand der Lampe um.",
          },
          {
            k: "p",
            text: "Ein Wechselschalter allein kann das nicht: Er verbindet einen Anschluss mit einem von zwei anderen, vertauschen kann er nichts.",
          },
          {
            k: "p",
            text: "Im gestrichelten Rahmen sieht man, wie ein Kreuzschalter innen aufgebaut ist: zwei Wechselschalter, die gemeinsam umschalten, und eine Kreuzung. Im Handel ist er ein einzelnes Gerät mit vier Anschlüssen.",
          },
        ],
        recall: "vermutung",
      },
    ],
  },
];
