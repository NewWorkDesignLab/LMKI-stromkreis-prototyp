import type { LegacyLevelDef } from "../legacy";
import { BASE, lockw, wall, wire } from "../helpers";

/* Aus dem Prototyp übernommen; Reihenfolge und Kapitelzuordnung steht in ../curriculum.ts */
export const messenLevels: LegacyLevelDef[] = [
  {
    id: "der-widerstand",
    concepts: ["widerstand"],
    name: "Der Widerstand",
    W: 7,
    H: 3,
    palette: BASE,
    showValues: true,
    task: "Verdrahte den Stromkreis. Der Widerstand begrenzt den Strom – lies am Amperemeter ab, wie viel fließt, und achte auf die Helligkeit.",
    lesson: "Ein Widerstand begrenzt den Strom. Mehr Widerstand im Stromkreis heißt weniger Strom.",
    cells: {
      "0,1": { type: "battery", orient: "v" },
      "6,1": { type: "lamp", orient: "v" },
      "2,0": { type: "ammeter", orient: "h" },
      "4,0": { type: "resistor", orient: "h", r: 100 },
      ...wall("1,1 2,1 3,1 4,1 5,1"),
    },
    goals: [
      {
        k: "measure",
        id: "strom",
        quantity: "current",
        of: "6,1",
        label: "Lies die Stromstärke ab",
      },
    ],
  },
  {
    id: "amperemeter-in-reihe",
    concepts: ["strommessung", "reihenschaltung"],
    name: "Amperemeter in Reihe",
    W: 6,
    H: 3,
    palette: ["wire", "ammeter", "erase"],
    stock: { ammeter: 1 },
    showValues: true,
    task: "Wie viel Strom fließt durch die Lampe? Miss ihn, ohne dass die Lampe ausgeht, und trage den Wert ein.",
    lesson:
      "Ein Amperemeter wird IN REIHE eingebaut. Parallel geschaltet würde sein sehr kleiner Innenwiderstand den Verbraucher kurzschließen.",
    cells: {
      "0,1": { type: "battery", orient: "v" },
      "4,1": { type: "lamp", orient: "v" },
    },
    goals: [
      {
        k: "measure",
        id: "strom",
        quantity: "current",
        of: "4,1",
        label: "Miss die Stromstärke durch die Lampe",
      },
    ],
  },
  {
    id: "voltmeter-parallel",
    concepts: ["spannungsmessung", "parallelschaltung"],
    name: "Voltmeter parallel",
    W: 6,
    H: 4,
    palette: ["wire", "voltmeter", "erase"],
    stock: { voltmeter: 1 },
    showValues: true,
    task: "Welche Spannung liegt an der Lampe? Miss sie und trage den Wert ein.",
    lesson:
      "Ein Voltmeter wird PARALLEL zum Bauteil geschaltet. In Reihe sperrt sein hoher Innenwiderstand den Stromkreis nahezu.",
    cells: {
      "0,1": { type: "battery", orient: "v" },
      "4,1": { type: "lamp", orient: "v" },
    },
    goals: [
      {
        k: "measure",
        id: "spannung",
        quantity: "voltage",
        of: "4,1",
        label: "Miss die Spannung an der Lampe",
      },
    ],
  },
  {
    id: "reihenschaltung-teilt-die-spannung",
    concepts: ["reihenschaltung", "spannungsteilung", "spannungsmessung"],
    name: "Reihenschaltung teilt die Spannung",
    W: 5,
    H: 4,
    palette: ["wire", "voltmeter", "erase"],
    stock: { voltmeter: 1 },
    showValues: true,
    task: "Zwei gleiche Lampen liegen in Reihe. Welche Spannung liegt an der linken? Miss sie und trage den Wert ein.",
    lesson:
      "In der Reihenschaltung teilt sich die Spannung auf die Verbraucher auf – bei zwei gleichen Lampen je die Hälfte.",
    cells: {
      "1,1": { type: "lamp", orient: "h" },
      "3,1": { type: "lamp", orient: "h" },
      "2,3": { type: "battery", orient: "h" },
      ...lockw("0,1 2,1 4,1 0,2 0,3 1,3 3,3 4,3 4,2"),
    },
    goals: [
      {
        k: "measure",
        id: "spannung",
        quantity: "voltage",
        of: "1,1",
        label: "Miss die Spannung an der linken Lampe",
      },
    ],
  },
  {
    id: "parallelschaltung-teilt-den-strom",
    concepts: ["parallelschaltung", "stromteilung", "strommessung"],
    name: "Parallelschaltung teilt den Strom",
    W: 7,
    H: 3,
    palette: ["wire", "ammeter", "erase"],
    stock: { ammeter: 1 },
    showValues: true,
    task: "Der Stromkreis ist fertig verdrahtet. Wie viel Strom liefert die Batterie insgesamt? Miss ihn und trage den Wert ein.",
    lesson:
      "In der Parallelschaltung teilt sich der Strom auf die Zweige auf – der Gesamtstrom ist die Summe.",
    cells: {
      "0,1": { type: "battery", orient: "v" },
      "3,1": { type: "lamp", orient: "v" },
      "5,1": { type: "lamp", orient: "v" },
      ...wire("0,0 1,0 2,0 3,0 4,0 5,0 6,0 0,2 1,2 2,2 3,2 4,2 5,2 6,2"),
      ...wall("1,1 2,1 4,1 6,1"),
    },
    goals: [
      {
        k: "measure",
        id: "gesamtstrom",
        quantity: "current",
        of: "0,1",
        label: "Miss den Gesamtstrom, den die Batterie liefert",
      },
    ],
  },
  {
    id: "ohmsches-gesetz",
    concepts: ["ohmsches-gesetz", "widerstand"],
    name: "Ohmsches Gesetz",
    W: 7,
    H: 3,
    palette: BASE,
    showValues: true,
    /* Erst rechnen, dann bauen: der Rechenweg erscheint erst nach dem ersten Versuch,
       damit er nicht überlesen, sondern angewendet wird. */
    before: [
      {
        kind: "quiz",
        id: "rechnen",
        title: "Rechnen",
        concepts: ["ohmsches-gesetz"],
        question: "Welchen zusätzlichen Widerstand brauchst du, damit genau 29 mA fließen?",
        blocks: [
          {
            k: "p",
            text: "Gegeben sind eine Spannung von 9 V und eine Lampe mit einem Widerstand von 90 Ω. Die Stromstärke im Stromkreis soll 29 mA betragen.",
          },
          { k: "widget", widget: "uri-dreieck" },
          {
            k: "note",
            text: "Gib den Widerstand auf ganze Ohm gerundet an – zum Beispiel 150 oder 0,15 kΩ.",
          },
        ],
        answer: { k: "number", value: 220, unit: "Ω", tolerance: 0.01 },
        explanation: [
          { k: "formula", text: "I = 29 mA = 0,029 A" },
          { k: "formula", text: "R_ges = U / I = 9 V / 0,029 A ≈ 310,34 Ω" },
          { k: "formula", text: "R_zus = R_ges − R_Lampe = 310,34 Ω − 90 Ω = 220,34 Ω" },
          { k: "p", text: "Auf die verfügbare Widerstandsstufe gerundet: 220 Ω." },
          { k: "formula", text: "Probe: I = 9 V / 310 Ω ≈ 0,029 A = 29 mA" },
        ],
      },
    ],
    task: "Stelle am Widerstand den Wert ein, den du berechnet hast, verdrahte den Stromkreis und überprüfe die Stromstärke mit dem Amperemeter.",
    lesson:
      "R = U / I. Der Gesamtwiderstand einer Reihenschaltung ist die Summe aller Widerstände.",
    cells: {
      "0,1": { type: "battery", orient: "v" },
      "6,1": { type: "lamp", orient: "v" },
      "2,0": {
        type: "resistor",
        orient: "h",
        values: [100, 220, 300, 470, 1000],
        r: 100,
      },
      "4,0": { type: "ammeter", orient: "h" },
      ...wall("1,1 2,1 3,1 4,1 5,1"),
    },
    goals: [
      {
        k: "read",
        type: "ammeter",
        min: 0.0285,
        max: 0.029499999,
        label: "Das Amperemeter zeigt 29 mA",
      },
    ],
  },
];
