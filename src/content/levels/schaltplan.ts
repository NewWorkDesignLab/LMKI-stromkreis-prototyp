import type { LevelDef } from "../../domain/types";
import { BASE, lockw, wall, wire } from "../helpers";

/* Aus dem Prototyp übernommen; Reihenfolge und Kapitelzuordnung steht in ../curriculum.ts */
export const schaltplanLevels: LevelDef[] = [
  {
    id: "knotenpunkt-oder-kreuzung",
    concepts: ["knotenpunkt", "kreuzung", "kurzschluss"],
    /* Fertig verdrahtet ausgeliefert, an den vier Kreuzungsstellen aber mit
           gewöhnlichen Leitungen: dadurch verschmilzt alles zu einem Knoten und
           beide Quellen sind kurzgeschlossen. Die vier Knotenpunkte sind der
           einzige Hinweis – hier wird der Knotenpunkt zum Rätselgegenstand. */
    name: "Knotenpunkt oder Kreuzung?",
    W: 7,
    H: 5,
    palette: ["cross", "wire", "erase"],
    showValues: true,
    task: "Zwei getrennte Stromkreise – trotzdem Kurzschluss. Die vier Knotenpunkte zeigen, wo die Leitungen elektrisch verbunden sind. Lösche sie und setze dort „Kreuzung“ ein.",
    lesson:
      "Die eingesetzten Kreuzungen führen die waagerechte und die senkrechte Leitung elektrisch getrennt aneinander vorbei. So bleiben die beiden Stromkreise getrennt und die Kurzschlüsse sind behoben.",
    cells: {
      "0,2": { type: "battery", orient: "v" },
      "6,2": { type: "lamp", orient: "v" },
      "3,0": { type: "battery", orient: "h" },
      "3,4": { type: "lamp", orient: "h" },
      ...lockw("0,1 1,1 3,1 5,1 6,1 0,3 1,3 3,3 5,3 6,3 2,0 2,2 2,4 4,0 4,2 4,4"),
      ...wire("2,1 4,1 2,3 4,3"),
      ...wall("1,0 5,0 1,4 5,4 1,2 3,2 5,2"),
    },
  },
  {
    id: "am-knotenpunkt-teilt-sich-der-strom",
    concepts: ["knotenpunkt", "stromteilung"],
    /* Ungleiche Zweige (90 Ω / 60 Ω), damit sich die Ströme sichtbar addieren
           statt bloß zu halbieren: 99 mA + 148 mA = 247 mA. Zwischen Quelle und
           unterem Knoten liegt mit 3,2 / 3,3 eine gerade Stammleitung – nur dort
           misst das Amperemeter den Gesamtstrom, im Zweig den Zweigstrom. */
    name: "Am Knotenpunkt teilt sich der Strom",
    W: 7,
    H: 5,
    palette: ["wire", "ammeter", "erase"],
    showValues: true,
    task: "Die Knotenpunkte aus dem letzten Level – hier sind sie gewollt. Setze das Amperemeter so ein, dass es nur den Strom durch die Lampe misst.",
    lesson:
      "Knotenregel: Am Knotenpunkt fließt so viel heraus, wie hineinfließt. 99 mA + 148 mA = 247 mA.",
    cells: {
      "3,1": { type: "battery", orient: "v" },
      "0,1": { type: "lamp", orient: "v" },
      "6,1": { type: "motor", orient: "v" },
      ...wire("0,0 1,0 2,0 3,0 4,0 5,0 6,0 0,2 0,3 3,2 3,3 6,2 6,3 0,4 1,4 2,4 3,4 4,4 5,4 6,4"),
      ...wall("1,1 2,1 4,1 5,1 1,2 2,2 4,2 5,2 1,3 2,3 4,3 5,3"),
    },
    goals: [
      {
        k: "read",
        type: "ammeter",
        min: 0.09,
        max: 0.11,
        label: "Das Amperemeter zeigt nur den Lampenstrom (99 mA)",
      },
    ],
  },
  {
    id: "anders-gezeichnet-und",
    concepts: ["reihenschaltung", "schaltplan-lesen"],
    name: "Anders gezeichnet – UND",
    W: 7,
    H: 5,
    palette: BASE,
    task: "Zwei Schalter in Reihe – dieselbe UND-Schaltung wie in Level 3 „Reihenschaltung = UND“. Nur läuft der Stromkreis diesmal außen um das Feld herum statt auf einer Linie.",
    lesson:
      "Ein Schaltplan zeigt die elektrische Verschaltung, nicht die räumliche Anordnung der Bauteile. Dieselbe Schaltung kann daher auf unterschiedliche Weise gezeichnet werden, solange die elektrischen Verbindungen unverändert bleiben.",
    cells: {
      "0,2": { type: "battery", orient: "v" },
      "6,2": { type: "lamp", orient: "v" },
      "3,0": { type: "switch", orient: "h", closed: false },
      "3,4": { type: "switch", orient: "h", closed: false },
      ...wall("1,1 2,1 3,1 4,1 5,1 1,2 2,2 3,2 4,2 5,2 1,3 2,3 3,3 4,3 5,3"),
    },
    goals: [
      {
        k: "logic",
        at: "6,2",
        expr: "and",
        inputs: ["3,0", "3,4"],
        live: true,
        label: "Die Lampe leuchtet nur, wenn beide Schalter geschlossen sind",
      },
    ],
  },
  {
    id: "zwei-spannungsquellen-in-reihe",
    concepts: ["quellen-in-reihe"],
    name: "Zwei Spannungsquellen in Reihe",
    W: 7,
    H: 3,
    palette: BASE,
    showValues: true,
    task: "Die Lampe braucht 18 V. Verdrahte beide Spannungsquellen in Reihe – tippe die zweite an, um ihre Polung zu drehen.",
    lesson:
      "In Reihe addieren sich die Spannungen – aber nur, wenn Plus an Minus liegt. Gegeneinander gepolt heben sie sich auf.",
    cells: {
      "0,1": { type: "battery", orient: "v" },
      "3,0": { type: "battery", orient: "h", rev: true, flip: true },
      "6,1": { type: "lamp", orient: "v", r: 360, un: 18, in: 0.05 },
      ...wall("1,1 2,1 3,1 4,1 5,1"),
    },
  },
];
