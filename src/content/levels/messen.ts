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
    ratings: "resistance",
    task: "Verdrahte den Stromkreis. Wie groß ist die Stromstärke mit dem Widerstand?",
    lesson:
      "Ein Widerstand begrenzt die Stromstärke: Je größer der Widerstand im Stromkreis, desto kleiner die Stromstärke.",
    explanation: [
      {
        k: "p",
        text: "Widerstand und Lampe liegen in Reihe, ihre Widerstände addieren sich. Bei gleicher Spannung fließt dadurch weniger Strom als mit der Lampe allein.",
      },
      { k: "formula", text: "I = U / R_ges = 9 V / (100 Ω + 90 Ω) ≈ 47 mA" },
      { k: "p", text: "Weniger Strom heißt: Die Lampe leuchtet dunkler." },
    ],
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
        unit: "mA",
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
    ratings: "nominal",
    task: "Wie groß ist die Stromstärke durch die Lampe? Die Lampe soll dabei weiter leuchten.",
    lesson: "Ein Amperemeter wird in Reihe zum Bauteil geschaltet.",
    explanation: [
      {
        k: "p",
        text: "Das Amperemeter misst die Stromstärke, die durch es selbst fließt. Es muss deshalb im Stromweg liegen: Der Strom fließt von der Spannungsquelle durch Amperemeter und Lampe und zurück, durch beide derselbe.",
      },
      {
        k: "p",
        text: "Damit es den Stromkreis dabei nicht verändert, hat es einen sehr kleinen Innenwiderstand. Die Lampe leuchtet nach dem Einbau weiter wie zuvor.",
      },
      {
        k: "p",
        text: "Parallel zur Lampe geschaltet, wäre es wegen dieses kleinen Innenwiderstands fast eine leitende Brücke – ein Kurzschluss wie in „Der Kurzschluss“ wäre die Folge.",
      },
    ],
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
        unit: "mA",
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
    ratings: "nominal",
    task: "Welche Spannung liegt an der Lampe an?",
    lesson: "Ein Voltmeter wird parallel zum Bauteil geschaltet.",
    explanation: [
      {
        k: "p",
        text: "Spannung liegt zwischen zwei Punkten an. Das Voltmeter wird deshalb an beide Anschlüsse der Lampe gelegt und zeigt die Spannung zwischen ihnen, hier die volle Spannung der Spannungsquelle.",
      },
      {
        k: "p",
        text: "Damit es dabei kaum Strom aus dem Stromkreis zieht und die Messung nicht verfälscht, hat es einen sehr hohen Innenwiderstand.",
      },
      {
        k: "p",
        text: "In Reihe geschaltet, würde dieser hohe Innenwiderstand den Stromkreis nahezu unterbrechen – die Lampe ginge aus. Beim Amperemeter ist es genau umgekehrt.",
      },
    ],
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
        unit: "V",
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
    ratings: "nominal",
    task: "Zwei gleiche Lampen liegen in Reihe. Welche Spannung liegt an der linken Lampe an?",
    lesson:
      "In der Reihenschaltung teilt sich die Spannung der Spannungsquelle auf die Verbraucher auf.",
    explanation: [
      {
        k: "p",
        text: "Durch beide Lampen fließt derselbe Strom. Haben sie gleiche Widerstände, fällt an beiden die gleiche Spannung ab.",
      },
      { k: "formula", text: "U_1 = U_2 = U_ges / 2 = 4,5 V" },
      {
        k: "p",
        text: "Die Teilspannungen ergeben zusammen wieder die Spannung der Spannungsquelle. Bei ungleichen Widerständen teilt sie sich ungleich auf: Am größeren Widerstand fällt die größere Spannung ab.",
      },
      { k: "formula", text: "U_ges = U_1 + U_2" },
    ],
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
        unit: "V",
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
    ratings: "nominal",
    task: "Der Stromkreis ist fertig verdrahtet. Wie groß ist der Gesamtstrom, den die Spannungsquelle liefert?",
    lesson:
      "In der Parallelschaltung teilt sich der Strom auf die Zweige auf. Der Gesamtstrom ist die Summe der Zweigströme.",
    explanation: [
      {
        k: "p",
        text: "Am Knotenpunkt teilt sich der Strom auf beide Lampen auf. In der Hauptleitung fließt der Strom aller Zweige zusammen – dort misst das Amperemeter den Gesamtstrom, den die Spannungsquelle liefert.",
      },
      { k: "formula", text: "I_ges = I_1 + I_2 ≈ 100 mA + 100 mA = 200 mA" },
      {
        k: "p",
        text: "Säße das Amperemeter in einem Zweig, zeigte es nur dessen Teilstrom. An jedem Zweig liegt dabei dieselbe Spannung, wie in „Parallelschaltung – beide Lampen“.",
      },
    ],
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
        unit: "mA",
        label: "Miss den Gesamtstrom",
      },
    ],
  },
];
