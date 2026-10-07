import type { LevelDef } from "../../domain/types";
import { BASE, wall, wire } from "../helpers";

/* Aus dem Prototyp übernommen; Reihenfolge und Kapitelzuordnung steht in ../curriculum.ts */
export const schutzLevels: LevelDef[] = [
  {
    id: "der-kurzschluss",
    concepts: ["kurzschluss"],
    name: "Der Kurzschluss",
    W: 6,
    H: 3,
    palette: BASE,
    showValues: true,
    task: "Die Lampe bleibt dunkel, obwohl der Stromkreis geschlossen ist. Eine Leitung überbrückt sie – finde und lösche sie.",
    lesson:
      "Ein Kurzschluss verbindet + und − ohne Verbraucher. Die Brücke hat keinen Widerstand: an der Lampe liegt keine Spannung mehr, also fließt durch sie kein Strom.",
    cells: {
      "0,1": { type: "battery", orient: "v" },
      "5,1": { type: "lamp", orient: "v" },
      ...wire("0,0 1,0 2,0 3,0 4,0 5,0 0,2 1,2 2,2 3,2 4,2 5,2 3,1"),
      ...wall("1,1 2,1 4,1"),
    },
  },
  {
    id: "die-sicherung",
    concepts: ["sicherung", "kurzschluss"],
    name: "Die Sicherung",
    W: 7,
    H: 3,
    palette: BASE,
    showValues: true,
    task: "Die Sicherung hat ausgelöst und trennt den Stromkreis. Beseitige die Ursache und tippe sie an, um sie wieder einzuschalten.",
    lesson:
      "Eine Sicherung trennt den Stromkreis bei Überstrom – sie schützt Leitung und Spannungsquelle. Einschalten hilft erst, wenn die Ursache weg ist.",
    cells: {
      "0,1": { type: "battery", orient: "v" },
      "6,1": { type: "lamp", orient: "v" },
      "2,0": { type: "fuse", orient: "h", imax: 0.5, open: true },
      ...wire("0,0 1,0 3,0 4,0 5,0 6,0 0,2 1,2 2,2 3,2 4,2 5,2 6,2 4,1"),
      ...wall("1,1 2,1 3,1 5,1"),
    },
    goals: [{ k: "fuse" }],
  },
  {
    id: "durchlass-und-sperrrichtung-der-led",
    concepts: ["led"],
    name: "Durchlass- und Sperrrichtung der LED",
    W: 6,
    H: 3,
    palette: BASE,
    showValues: true,
    task: "Verdrahte den Stromkreis. Eine LED leitet nur in Durchlassrichtung – tippe sie an, um sie zu drehen.",
    lesson:
      "Die LED leitet nur von Anode zur Kathode (Balken). Falsch gepolt sperrt sie vollständig.",
    cells: {
      "0,1": { type: "battery", orient: "v" },
      "2,0": { type: "resistor", orient: "h", r: 470 },
      "5,1": { type: "led", orient: "v", rev: true },
      ...wall("1,1 2,1 3,1 4,1"),
    },
  },
  {
    id: "der-vorwiderstand",
    concepts: ["led", "widerstand"],
    name: "Der Vorwiderstand",
    W: 7,
    H: 3,
    palette: BASE,
    showValues: true,
    task: "Der Durchlassstrom der LED darf höchstens 30 mA betragen. Verdrahte den Stromkreis und tippe den Widerstand an, um seinen Wert zu wechseln – gesucht sind 12–18 mA.",
    lesson: "Eine LED braucht immer einen Vorwiderstand: R = (Uq − UF) / I.",
    cells: {
      "0,1": { type: "battery", orient: "v" },
      "2,0": {
        type: "resistor",
        orient: "h",
        values: [100, 330, 470, 1000],
        r: 100,
      },
      "4,0": { type: "ammeter", orient: "h" },
      "6,1": { type: "led", orient: "v" },
      ...wall("1,1 2,1 3,1 4,1 5,1"),
    },
    goals: [
      {
        k: "read",
        type: "ammeter",
        min: 0.012,
        max: 0.018,
        label: "Der LED-Strom liegt zwischen 12 und 18 mA",
      },
    ],
  },
];
