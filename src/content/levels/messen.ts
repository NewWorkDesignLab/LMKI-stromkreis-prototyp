import type { LevelDef } from "../../domain/types";
import { BASE, lockw, wall, wire } from "../helpers";

/* Aus dem Prototyp übernommen; Reihenfolge und Kapitelzuordnung steht in ../curriculum.ts */
export const messenLevels: LevelDef[] = [
  {
    id: "der-widerstand",
    concepts: ["widerstand"],
    name: "Der Widerstand",
    W: 7,
    H: 3,
    palette: BASE,
    showValues: true,
    task: "Verdrahte den Stromkreis. Der Widerstand begrenzt den Strom – beobachte Amperemeter und Helligkeit.",
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
        k: "read",
        type: "ammeter",
        min: 0.04,
        max: 0.055,
        label: "Das Amperemeter zeigt etwa 47 mA",
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
    showValues: true,
    task: "Setze das Amperemeter so ein, dass es den Lampenstrom misst – und die Lampe weiter leuchtet.",
    lesson:
      "Ein Amperemeter wird IN REIHE eingebaut. Parallel geschaltet würde sein sehr kleiner Innenwiderstand den Verbraucher kurzschließen.",
    cells: {
      "0,1": { type: "battery", orient: "v" },
      "4,1": { type: "lamp", orient: "v" },
    },
    goals: [
      {
        k: "read",
        type: "ammeter",
        min: 0.09,
        max: 0.11,
        label: "Das Amperemeter zeigt etwa 100 mA",
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
    showValues: true,
    task: "Miss die Spannung an der Lampe. Das Voltmeter braucht einen eigenen Zweig neben der Lampe.",
    lesson:
      "Ein Voltmeter wird PARALLEL zum Bauteil geschaltet. In Reihe sperrt sein hoher Innenwiderstand den Stromkreis nahezu.",
    cells: {
      "0,1": { type: "battery", orient: "v" },
      "4,1": { type: "lamp", orient: "v" },
    },
    goals: [
      {
        k: "read",
        type: "voltmeter",
        min: 8.4,
        max: 9.05,
        label: "Das Voltmeter zeigt die Lampenspannung (≈ 9 V)",
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
    showValues: true,
    task: "Zwei gleiche Lampen liegen in Reihe. Miss mit dem Voltmeter die Spannung an der linken Lampe.",
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
        k: "read",
        type: "voltmeter",
        min: 3.9,
        max: 4.9,
        label: "Das Voltmeter zeigt etwa 4,5 V – die halbe Quellenspannung",
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
    showValues: true,
    task: "Der Stromkreis ist fertig verdrahtet. Miss den Gesamtstrom: setze das Amperemeter in die Hauptleitung.",
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
        k: "read",
        type: "ammeter",
        min: 0.17,
        max: 0.22,
        label: "Das Amperemeter zeigt den Gesamtstrom (≈ 200 mA)",
      },
    ],
  },
  {
    id: "ohmsches-gesetz",
    concepts: ["ohmsches-gesetz", "widerstand"],
    name: "Ohmsches Gesetz",
    ohmLab: true,
    W: 7,
    H: 3,
    palette: BASE,
    showValues: true,
    task: "Gegeben sind eine Spannung von 9 V und eine Lampe mit einem Widerstand von 90 Ω. Die Stromstärke im Stromkreis soll 29 mA betragen. Berechne den zusätzlich benötigten Widerstand. Wähle anschließend den passenden Widerstand aus, verdrahte den Stromkreis und überprüfe die Stromstärke mit dem Amperemeter.",
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
