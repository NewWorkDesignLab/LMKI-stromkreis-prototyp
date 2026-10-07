import type { LevelDef } from "../../domain/types";
import { BASE, lockw, wall } from "../helpers";

/* Aus dem Prototyp übernommen; Reihenfolge und Kapitelzuordnung steht in ../curriculum.ts */
export const erweiterungLevels: LevelDef[] = [
  {
    id: "der-dimmer",
    concepts: ["widerstand", "ohmsches-gesetz"],
    name: "Der Dimmer",
    W: 7,
    H: 3,
    palette: BASE,
    showValues: true,
    task: "Verdrahte den Stromkreis. Tippe dann den Widerstand an: Je größer er ist, desto weniger Strom fließt und desto dunkler wird die Lampe. Gesucht ist die dunkelste Stufe, bei der sie gerade noch leuchtet.",
    lesson:
      "Ein Widerstand in Reihe dimmt die Lampe: mehr Widerstand, weniger Strom, weniger Licht. Wird er zu groß, reicht der Strom zum Leuchten nicht mehr aus.",
    cells: {
      "0,1": { type: "battery", orient: "v" },
      "6,1": { type: "lamp", orient: "v" },
      "2,0": { type: "ammeter", orient: "h" },
      "4,0": {
        type: "resistor",
        orient: "h",
        values: [10, 47, 100, 220, 470],
        r: 10,
      },
      ...wall("1,1 2,1 3,1 4,1 5,1"),
    },
    goals: [
      {
        k: "read",
        type: "ammeter",
        min: 0.025,
        max: 0.035,
        label:
          "Der Strom liegt bei etwa 30 mA – die dunkelste Stufe, bei der die Lampe noch leuchtet",
      },
    ],
  },
  {
    id: "fehlersuche-die-wechselschaltung",
    concepts: ["fehlersuche", "wechselschalter"],
    /* Die Wechselschaltung aus Level 13, fertig verlegt – bis auf 3,1. Diese
           eine Zelle verbindet die beiden korrespondierenden Leitungen und macht
           damit beide Schalter wirkungslos: von der Wurzel des einen Schalters
           führt dann in JEDER Stellung ein Weg zur Wurzel des anderen. */
    name: "Fehlersuche: Die Wechselschaltung",
    W: 7,
    H: 5,
    palette: BASE,
    task: "Dieselbe Flurschaltung wie vorhin – nur lässt sich das Licht nicht mehr ausschalten, egal welchen Schalter du umlegst. Eine einzige Leitung verbindet die beiden korrespondierenden Leitungen miteinander. Finde und lösche sie.",
    lesson:
      "Die beiden korrespondierenden Leitungen müssen getrennt bleiben. Sind sie verbunden, findet der Strom in jeder Schalterstellung einen Weg – und beide Schalter sind wirkungslos.",
    cells: {
      "0,2": { type: "battery", orient: "v" },
      "6,2": { type: "lamp", orient: "v" },
      "2,1": { type: "spdt", dir: "W", pos: 0 },
      "4,1": { type: "spdt", dir: "E", pos: 0 },
      ...lockw("0,1 1,1 5,1 6,1 2,0 3,0 4,0 2,2 3,2 4,2 0,3 6,3 0,4 1,4 2,4 3,4 4,4 5,4 6,4"),
      "3,1": { type: "wire" },
      ...wall("1,0 5,0 1,2 5,2 2,3 3,3 4,3"),
    },
    goals: [
      {
        k: "toggle",
        at: "6,2",
        inputs: ["2,1", "4,1"],
        label: "Jeder der beiden Schalter schaltet das Licht um",
      },
    ],
  },
  {
    id: "das-licht-im-schalter",
    concepts: ["schaltplan-lesen", "parallelschaltung"],
    /* Orientierungslicht im Schalter. Die LED liegt mit ihrem Vorwiderstand
           in einer Umgehung parallel zum Schalter – bei 1 kΩ fließen im offenen
           Zustand 6,3 mA: der LED genug, der Lampe viel zu wenig. Geschlossen
           überbrückt der Schalter die Umgehung, die LED sperrt.
           Waagerechte Bauteile haben oben und unten keinen Anschluss – deshalb
           berühren Widerstand und LED die Zuleitung darunter nicht. */
    name: "Das Licht im Schalter",
    switchOrientation: true,
    W: 7,
    H: 4,
    palette: BASE,
    showValues: true,
    task: "Beleuchtete Lichtschalter besitzen oft eine kleine Glimmleuchte, die im Dunkeln schwach glimmt, wenn das Licht ausgeschaltet ist. Hier wird sie durch eine LED mit Vorwiderstand dargestellt. Verdrahte den Stromkreis so, dass die LED bei ausgeschalteter Lampe leuchtet und bei eingeschalteter Lampe erlischt.",
    lesson:
      "Die LED liegt parallel zum Schalter. Bei offenem Schalter fließt ein minimaler Strom durch LED und Lampe (hier 6,3 mA). Der LED (Glimmleuchte) reicht das zum Leuchten, der Lampe bei Weitem nicht. Geschlossen überbrückt der Schalter die LED, sie bekommt keine Spannung mehr und erlischt.",
    cells: {
      "0,2": { type: "battery", orient: "v" },
      "6,2": { type: "lamp", orient: "v" },
      "3,1": { type: "switch", orient: "h", closed: false },
      "3,0": { type: "resistor", orient: "h", values: [1000], r: 1000 },
      "4,0": { type: "led", orient: "h" },
      ...wall("0,0 1,0 6,0 1,2 2,2 3,2 4,2 5,2"),
    },
    frames: [{ x: 2, y: 0, w: 4, h: 2 }],
    goals: [
      {
        k: "logic",
        at: "6,2",
        expr: "id",
        inputs: ["3,1"],
        label: "Die Lampe leuchtet, wenn der Schalter geschlossen ist",
      },
      {
        k: "logic",
        at: "4,0",
        expr: "not",
        inputs: ["3,1"],
        label: "Die LED leuchtet genau dann, wenn die Lampe aus ist",
      },
    ],
  },
  {
    id: "der-oeffner",
    concepts: ["oeffner", "taster"],
    /* Ein einzelner Öffner sieht aus wie ein gewöhnlicher Kontakt – der
           Unterschied ist nur im Vergleich zu sehen. Deshalb hängen hier beide
           Arten nebeneinander an derselben Quelle: sobald Strom fließt, brennt
           die eine Lampe und die andere nicht, ohne dass jemand etwas betätigt.
           Als Taster, weil das Halten den Unterschied körperlich macht. */
    name: "Der Öffner",
    contactLab: true,
    W: 6,
    H: 4,
    palette: BASE,
    task: "Verbinde beide Lampenzweige mit der Quelle. Untersuche danach beide Taster: Was verbindet sich beim Drücken, was trennt sich? Die Funktionsansicht unter dem Schaltplan zeigt dir die Bewegung im Bauteil – probiere beide aus.",
    lesson:
      "Der Name beschreibt, was passiert: Der Öffner öffnet den Stromkreis, wenn er betätigt wird. Während er im Ruhezustand Strom durchlässt. Der Schließer schließt den Stromkreis, wenn er betätigt wird. Während er im Ruhezustand keinen Strom durchlässt.",
    cells: {
      "0,2": { type: "battery", orient: "v" },
      "2,1": {
        type: "button",
        orient: "v",
        closed: false,
        name: "Schließer",
      },
      "4,1": { type: "button", orient: "v", nc: true, closed: true },
      "2,2": { type: "lamp", orient: "v" },
      "4,2": { type: "lamp", orient: "v" },
      ...wall("1,1 3,1 5,1 1,2 3,2 5,2"),
    },
    goals: [
      {
        k: "logic",
        at: "2,2",
        expr: "id",
        inputs: ["2,1"],
        label: "Die linke Lampe leuchtet nur, solange der Schließer betätigt ist",
      },
      {
        k: "logic",
        at: "4,2",
        expr: "not",
        inputs: ["4,1"],
        label: "Die rechte Lampe erlischt, solange der Öffner betätigt ist",
      },
    ],
  },
  {
    id: "der-not-aus",
    concepts: ["oeffner", "steuerlogik"],
    name: "Der Not-Aus",
    W: 7,
    H: 4,
    palette: BASE,
    task: "Der rote Not-Aus ist ein Öffner wie der Taster von eben: Im Ruhezustand leitet er. Motor und Lampe bekommen je einen eigenen Schalter – verdrahte alles so, dass der Not-Aus beides auf einmal abschaltet.",
    lesson:
      "Der Not-Aus liegt in der Hauptleitung und ist ein Öffner: Betätigt trennt er den ganzen Stromkreis, ganz gleich welcher Zweigschalter eingeschaltet ist. Dass er im Ruhezustand leitet, ist Absicht – reißt die Leitung zu ihm ab, bleibt die Maschine stehen, statt weiterzulaufen.",
    cells: {
      "0,2": { type: "battery", orient: "v" },
      "1,0": {
        type: "switch",
        orient: "h",
        nc: true,
        closed: true,
        danger: true,
        name: "Not-Aus",
      },
      "3,1": { type: "switch", orient: "v", closed: false },
      "5,1": { type: "switch", orient: "v", closed: false },
      "3,2": { type: "motor", orient: "v" },
      "5,2": { type: "lamp", orient: "v" },
      ...wall("1,1 2,1 4,1 6,1 1,2 2,2 4,2 6,2"),
    },
    goals: [
      {
        k: "logic",
        at: "3,2",
        expr: "and",
        inputs: ["!1,0", "3,1"],
        label: "Der Motor läuft nur mit seinem eigenen Schalter",
      },
      {
        k: "logic",
        at: "5,2",
        expr: "and",
        inputs: ["!1,0", "5,1"],
        label: "Die Lampe leuchtet nur mit ihrem eigenen Schalter",
      },
      {
        k: "seen",
        label: "Motor und Lampe liefen gemeinsam",
      },
      {
        k: "state",
        pressed: { "1,0": true, "3,1": true, "5,1": true },
        label: "Not-Aus gedrückt – beides steht still, obwohl beide Schalter auf EIN stehen",
      },
    ],
    /* Ohne diesen Merker ließe sich das Level lösen, indem man erst den
           Not-Aus drückt und dann die Schalter umlegt – die Anlage hätte nie
           gelaufen, und genau das soll der Not-Aus ja unterbrechen. */
    latch: { lit: ["3,2", "5,2"] },
  },
];
