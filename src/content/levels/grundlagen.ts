import type { LegacyLevelDef } from "../legacy";
import { BASE, wall } from "../helpers";

/* Aus dem Prototyp übernommen; Reihenfolge und Kapitelzuordnung steht in ../curriculum.ts */
export const grundlagenLevels: LegacyLevelDef[] = [
  {
    id: "schliesse-den-stromkreis",
    concepts: ["stromkreis"],
    tutorial: "drawWire",
    name: "Schließe den Stromkreis",
    W: 5,
    H: 3,
    palette: BASE,
    task: "Verbinde Spannungsquelle und Lampe zu einem geschlossenen Stromkreis.",
    lesson: "Strom fließt nur im geschlossenen Stromkreis.",
    explanation: [
      {
        k: "p",
        text: "Ein Stromkreis besteht aus Spannungsquelle, Verbraucher und zwei Leitungen: der Hinleitung vom Pluspol zum Verbraucher und der Rückleitung vom Verbraucher zum Minuspol.",
      },
      {
        k: "p",
        text: "Ist der Stromkreis an einer einzigen Stelle unterbrochen, fließt nirgends Strom – auch nicht in den Leitungen, die noch angeschlossen sind.",
      },
    ],
    cells: {
      "0,1": { type: "battery", orient: "v" },
      "4,1": { type: "lamp", orient: "v" },
    },
  },
  {
    id: "der-schalter",
    concepts: ["stromkreis", "schalter"],
    tutorial: "tapSwitch",
    name: "Der Schalter",
    W: 5,
    H: 3,
    palette: BASE,
    task: "Baue den Schalter in den Stromkreis ein und schalte die Lampe ein.",
    lesson: "Ein Schalter ist eine gewollte Unterbrechung des Stromkreises.",
    explanation: [
      {
        k: "p",
        text: "Ein geschlossener Schalter leitet, ein offener trennt. So lässt sich ein Verbraucher ein- und ausschalten, ohne eine Leitung zu lösen.",
      },
      {
        k: "p",
        text: "Der Schalter liegt in Reihe mit der Lampe, also auf dem einzigen Stromweg. Er bleibt in der Stellung, in die man ihn gebracht hat.",
      },
    ],
    cells: {
      "0,1": { type: "battery", orient: "v" },
      "4,1": { type: "lamp", orient: "v" },
      "2,0": { type: "switch", orient: "h", closed: false },
      ...wall("1,1 2,1 3,1"),
    },
  },
  {
    id: "reihenschaltung-und",
    concepts: ["reihenschaltung", "schalter", "logik-und"],
    name: "Reihenschaltung = UND",
    W: 7,
    H: 3,
    palette: BASE,
    task: "Schalte die beiden Schalter in Reihe und prüfe alle vier Schalterkombinationen.",
    lesson:
      "In Reihe geschaltete Schalter wirken wie UND: nur wenn alle geschlossen sind, fließt Strom.",
    explanation: [
      {
        k: "p",
        text: "In der Reihenschaltung gibt es nur einen Stromweg, und er führt nacheinander durch beide Schalter. Ist einer davon offen, ist der Stromweg unterbrochen.",
      },
      {
        k: "list",
        items: [
          "Beide Schalter offen: Die Lampe bleibt aus.",
          "Nur der linke Schalter geschlossen: Die Lampe bleibt aus.",
          "Nur der rechte Schalter geschlossen: Die Lampe bleibt aus.",
          "Beide Schalter geschlossen: Die Lampe leuchtet.",
        ],
      },
    ],
    cells: {
      "0,1": { type: "battery", orient: "v" },
      "6,1": { type: "lamp", orient: "v" },
      "2,0": { type: "switch", orient: "h", closed: false },
      "4,0": { type: "switch", orient: "h", closed: false },
      ...wall("1,1 2,1 3,1 4,1 5,1"),
    },
    goals: [
      {
        k: "logic",
        at: "6,1",
        expr: "and",
        inputs: ["2,0", "4,0"],
        live: true,
        label: "Die Lampe leuchtet nur, wenn beide Schalter geschlossen sind",
      },
    ],
  },
  {
    id: "parallelschaltung-beide-lampen",
    concepts: ["parallelschaltung"],
    name: "Parallelschaltung – beide Lampen",
    W: 7,
    H: 3,
    palette: BASE,
    task: "Schließe beide Lampen parallel an: jede Lampe direkt zwischen Plus- und Minusleitung.",
    lesson:
      "In der Parallelschaltung liegen alle Verbraucher an derselben Spannung und arbeiten unabhängig voneinander.",
    explanation: [
      {
        k: "p",
        text: "Jede Lampe ist direkt mit der Plus- und der Minusleitung verbunden und bildet mit der Spannungsquelle einen eigenen Zweig. Beide bekommen deshalb die volle Spannung und leuchten so hell wie eine Lampe allein.",
      },
      {
        k: "p",
        text: "Fällt eine Lampe aus, ist nur ihr Zweig unterbrochen. Die andere leuchtet weiter.",
      },
    ],
    cells: {
      "0,1": { type: "battery", orient: "v" },
      "3,1": { type: "lamp", orient: "v" },
      "5,1": { type: "lamp", orient: "v" },
      ...wall("1,1 2,1 4,1 6,1"),
    },
  },
  {
    id: "waehle-den-stromweg",
    concepts: ["stromkreis", "schalter", "parallelschaltung"],
    name: "Wähle den Stromweg",
    W: 7,
    H: 4,
    palette: BASE,
    task: "Verdrahte beide Zweige und schalte so, dass nur die linke Lampe leuchtet.",
    lesson:
      "Jeder Zweig einer Parallelschaltung lässt sich mit einem eigenen Schalter getrennt schalten.",
    explanation: [
      {
        k: "p",
        text: "Jeder Schalter liegt in seinem Zweig in Reihe mit seiner Lampe. Ist er offen, ist nur dieser Zweig unterbrochen.",
      },
      {
        k: "p",
        text: "Der andere Zweig bleibt davon unberührt – die Zweige sind unabhängig voneinander, wie in „Parallelschaltung – beide Lampen“.",
      },
    ],
    cells: {
      "0,1": { type: "battery", orient: "v" },
      "0,2": { type: "wire" },
      "2,1": { type: "switch", orient: "v", closed: false },
      "2,2": { type: "lamp", orient: "v", goal: "on" },
      "4,1": { type: "switch", orient: "v", closed: false },
      "4,2": { type: "lamp", orient: "v", goal: "off" },
      ...wall("1,1 1,2 3,1 3,2 5,1 6,1 5,2 6,2"),
    },
    /* Ohne eigene Texte hießen beide Ziele nur „Die Lampe …“ – welche, bliebe offen. */
    goals: [
      { k: "wired", ats: ["2,2", "4,2"], label: "Beide Lampen sind angeschlossen" },
      { k: "on", at: "2,2", on: true, label: "Die linke Lampe leuchtet" },
      { k: "on", at: "4,2", on: false, label: "Die rechte Lampe bleibt aus" },
    ],
  },
];
