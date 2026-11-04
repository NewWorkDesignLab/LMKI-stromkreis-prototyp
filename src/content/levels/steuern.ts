import type { LegacyLevelDef } from "../legacy";
import { BASE, lockw, wall } from "../helpers";

/* Aus dem Prototyp übernommen; Reihenfolge und Kapitelzuordnung steht in ../curriculum.ts */
export const steuernLevels: LegacyLevelDef[] = [
  {
    id: "der-taster",
    concepts: ["taster", "schalter"],
    name: "Der Taster",
    W: 6,
    H: 3,
    palette: BASE,
    task: "Baue den Taster in den Stromkreis ein und betätige ihn.",
    lesson:
      "Ein Taster wirkt nur, solange er betätigt wird. Lässt man ihn los, kehrt er in den Ruhezustand zurück.",
    explanation: [
      {
        k: "p",
        text: "Eine Feder drückt den Taster nach dem Loslassen zurück. Dieser Taster ist im Ruhezustand offen und schließt beim Betätigen – man nennt ihn deshalb Schließer.",
      },
      {
        k: "p",
        text: "Anders als ein Schalter merkt sich ein Taster keine Stellung. Er sitzt dort, wo etwas nur während des Betätigens geschehen soll, zum Beispiel an einer Klingel.",
      },
    ],
    cells: {
      "0,1": { type: "battery", orient: "v" },
      "5,1": { type: "lamp", orient: "v" },
      "2,0": { type: "button", orient: "h", closed: false },
      ...wall("1,1 2,1 3,1 4,1"),
    },
    goals: [
      {
        k: "logic",
        at: "5,1",
        expr: "id",
        inputs: ["2,0"],
        /* Ohne das Betätigen wäre das Level schon mit dem Verdrahten geschafft – das Ziel
           spricht aber vom Betätigen, und darum geht es im Level. */
        operated: true,
        label: "Die Lampe leuchtet nur, solange der Taster betätigt ist",
      },
    ],
  },
  {
    id: "parallelschaltung-oder",
    concepts: ["parallelschaltung", "logik-oder"],
    name: "Parallelschaltung = ODER",
    W: 7,
    H: 4,
    palette: BASE,
    task: "Schalte die beiden Schalter parallel, sodass jeder allein die Lampe einschalten kann.",
    lesson: "Parallel geschaltete Schalter wirken wie ODER: Ein geschlossener Schalter genügt.",
    explanation: [
      {
        k: "p",
        text: "Jeder Schalter liegt in einem eigenen Zweig. Ist einer davon geschlossen, gibt es einen geschlossenen Stromweg zur Lampe.",
      },
      {
        k: "list",
        items: [
          "Beide Schalter offen: Die Lampe bleibt aus.",
          "Nur der obere Schalter geschlossen: Die Lampe leuchtet.",
          "Nur der untere Schalter geschlossen: Die Lampe leuchtet.",
          "Beide Schalter geschlossen: Die Lampe leuchtet.",
        ],
      },
      {
        k: "p",
        text: "Das Gegenstück ist „Reihenschaltung = UND“: Dort mussten alle Schalter geschlossen sein.",
      },
    ],
    cells: {
      "0,2": { type: "battery", orient: "v" },
      "6,2": { type: "lamp", orient: "v" },
      "3,0": { type: "switch", orient: "h", closed: false },
      "3,1": { type: "switch", orient: "h", closed: false },
      ...wall("1,2 2,2 3,2 4,2 5,2"),
    },
    goals: [
      {
        k: "logic",
        at: "6,2",
        expr: "or",
        inputs: ["3,0", "3,1"],
        live: true,
        label: "Die Lampe leuchtet, wenn mindestens ein Schalter geschlossen ist",
      },
    ],
  },
  {
    id: "der-wechselschalter",
    concepts: ["wechselschalter"],
    name: "Der Wechselschalter",
    W: 5,
    H: 5,
    palette: BASE,
    task: "Führe von beiden Lampen eine gemeinsame Rückleitung zur Spannungsquelle und schalte den Wechselschalter um.",
    lesson:
      "Ein Wechselschalter (Umschalter) verbindet seinen gemeinsamen Anschluss wahlweise mit einem von zwei Anschlüssen.",
    explanation: [
      {
        k: "p",
        text: "Der Wechselschalter hat drei Anschlüsse. In Stellung 1 ist der gemeinsame Anschluss mit dem einen verbunden, in Stellung 2 mit dem anderen.",
      },
      {
        k: "p",
        text: "Er schaltet deshalb nicht ein und aus, sondern um: Der Strom fließt entweder durch die obere oder durch die untere Lampe. Über die gemeinsame Rückleitung sind beide Lampen mit der Spannungsquelle verbunden.",
      },
    ],
    cells: {
      "1,2": { type: "battery", orient: "h" },
      "3,2": { type: "spdt", dir: "W", pos: 0 },
      "3,1": { type: "lamp", orient: "v" },
      "3,3": { type: "lamp", orient: "v" },
      ...wall("2,1 2,3"),
    },
    goals: [
      {
        k: "logic",
        at: "3,1",
        expr: "not",
        inputs: ["3,2"],
        label: "Die obere Lampe leuchtet in Stellung 1",
      },
      {
        k: "logic",
        at: "3,3",
        expr: "id",
        inputs: ["3,2"],
        label: "Die untere Lampe leuchtet in Stellung 2",
      },
    ],
  },
  {
    id: "die-wechselschaltung",
    concepts: ["wechselschalter", "logik-xor"],
    name: "Die Wechselschaltung",
    W: 7,
    H: 6,
    palette: BASE,
    task: "Flurlicht: Verbinde die beiden Wechselschalter über zwei korrespondierende Leitungen, sodass jeder Schalter das Licht ein- und ausschalten kann.",
    lesson:
      "In der Wechselschaltung schaltet jeder der beiden Wechselschalter das Licht um, ganz gleich, wie der andere steht.",
    explanation: [
      {
        k: "p",
        text: "Die beiden Wechselschalter sind über zwei korrespondierende Leitungen verbunden. Die Lampe leuchtet, wenn beide Schalter auf dieselbe Leitung geschaltet sind. Sind sie auf verschiedene geschaltet, ist der Stromkreis offen.",
      },
      {
        k: "p",
        text: "Wer einen der beiden Schalter umlegt, wechselt auf die andere Leitung – der Zustand der Lampe kehrt sich um. So lässt sich ein Flurlicht an beiden Enden des Flurs ein- und ausschalten.",
      },
    ],
    cells: {
      "0,3": { type: "battery", orient: "v" },
      "6,3": { type: "lamp", orient: "v" },
      "2,2": { type: "spdt", dir: "W", pos: 0 },
      "4,2": { type: "spdt", dir: "E", pos: 0 },
      ...lockw("0,2 1,2 5,2 6,2 0,4 0,5 1,5 2,5 3,5 4,5 5,5 6,5 6,4"),
      ...wall("1,1 5,1 1,3 5,3 3,2 2,4 3,4 4,4"),
    },
    goals: [
      {
        k: "toggle",
        at: "6,3",
        inputs: ["2,2", "4,2"],
        label: "Jeder Schalter schaltet das Licht um",
      },
    ],
  },
  {
    id: "motor-und-summer",
    concepts: ["verbraucher"],
    name: "Motor und Summer",
    W: 7,
    H: 4,
    palette: BASE,
    task: "Schließe Motor und Summer parallel an, sodass jeder Verbraucher mit seinem eigenen Schalter geschaltet wird.",
    lesson:
      "Verbraucher wandeln elektrische Energie in eine andere Form um: die Lampe in Licht, der Motor in Bewegung, der Summer in Schall.",
    explanation: [
      {
        k: "p",
        text: "Im Stromkreis verhalten sich alle Verbraucher gleich: Sie brauchen einen geschlossenen Stromkreis und eine ausreichende Stromstärke. Darunter läuft der Motor nicht an und der Summer bleibt still.",
      },
      {
        k: "p",
        text: "Motor und Summer liegen hier in eigenen Zweigen, jeder mit seinem Schalter – so wie die Lampen in „Wähle den Stromweg“.",
      },
    ],
    cells: {
      "0,2": { type: "battery", orient: "v" },
      "3,1": { type: "switch", orient: "v", closed: false },
      "5,1": { type: "switch", orient: "v", closed: false },
      "3,2": { type: "motor", orient: "v" },
      "5,2": { type: "buzzer", orient: "v" },
      ...wall("1,1 2,1 4,1 6,1 1,2 2,2 4,2 6,2"),
    },
    goals: [
      {
        k: "logic",
        at: "3,2",
        expr: "id",
        inputs: ["3,1"],
        label: "Der Motor läuft nur mit dem linken Schalter",
      },
      {
        k: "logic",
        at: "5,2",
        expr: "id",
        inputs: ["5,1"],
        label: "Der Summer summt nur mit dem rechten Schalter",
      },
    ],
  },
];
