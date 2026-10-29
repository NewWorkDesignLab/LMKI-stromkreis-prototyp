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
    lesson: "Parallele Verbraucher liegen an derselben Spannung und sind voneinander unabhängig.",
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
    lesson: "Strom fließt nur über geschlossene Stromwege – du entscheidest, welcher das ist.",
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
