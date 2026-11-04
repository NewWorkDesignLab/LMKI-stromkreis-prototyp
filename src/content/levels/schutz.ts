import type { LegacyLevelDef } from "../legacy";
import { BASE, wall, wire } from "../helpers";

/* Aus dem Prototyp übernommen; Reihenfolge und Kapitelzuordnung steht in ../curriculum.ts */
export const schutzLevels: LegacyLevelDef[] = [
  {
    id: "der-kurzschluss",
    concepts: ["kurzschluss"],
    name: "Der Kurzschluss",
    W: 6,
    H: 3,
    palette: BASE,
    ratings: "nominal",
    task: "Die Lampe bleibt dunkel, obwohl der Stromkreis geschlossen ist. Finde den Kurzschluss und beseitige ihn.",
    lesson:
      "Ein Kurzschluss verbindet Pluspol und Minuspol ohne Verbraucher. Der Verbraucher wird dabei überbrückt.",
    explanation: [
      {
        k: "p",
        text: "Die Brücke ist eine Leitung ohne nennenswerten Widerstand und liegt parallel zur Lampe. Zwischen ihren Enden liegt deshalb keine Spannung an – auch nicht an der Lampe, sie bleibt dunkel.",
      },
      {
        k: "p",
        text: "Durch die Brücke selbst fließt dafür ein sehr großer Strom, den nur der kleine Innenwiderstand der Spannungsquelle begrenzt. Leitungen und Spannungsquelle werden dabei überlastet – davor schützt eine Sicherung.",
      },
    ],
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
    ratings: "nominal",
    task: "Die Sicherung hat ausgelöst. Beseitige die Ursache und schalte die Sicherung wieder ein.",
    lesson:
      "Eine Sicherung trennt den Stromkreis, wenn die Stromstärke zu groß wird. Wieder einschalten hilft erst, wenn die Ursache beseitigt ist.",
    explanation: [
      {
        k: "p",
        text: "Die Sicherung liegt in Reihe im Stromkreis, der ganze Strom fließt durch sie. Übersteigt die Stromstärke ihren Nennstrom, löst sie aus und unterbricht den Stromkreis. So schützt sie Leitungen und Spannungsquelle vor Überlastung.",
      },
      {
        k: "p",
        text: "Die Ursache war ein Kurzschluss wie in „Der Kurzschluss“. Solange er besteht, löst die Sicherung nach dem Einschalten sofort wieder aus.",
      },
    ],
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
    ratings: "nominal",
    task: "Verdrahte den Stromkreis und baue die LED in Durchlassrichtung ein.",
    lesson:
      "Eine LED leitet nur in Durchlassrichtung, von der Anode zur Kathode. In Sperrrichtung fließt kein Strom.",
    explanation: [
      {
        k: "p",
        text: "Im Schaltzeichen zeigt das Dreieck in Durchlassrichtung, der Balken markiert die Kathode. Die Anode muss zum Pluspol, die Kathode zum Minuspol zeigen.",
      },
      {
        k: "p",
        text: "Anders als eine Lampe hat die LED eine Polung: Falsch herum eingebaut sperrt sie und bleibt dunkel.",
      },
    ],
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
    ratings: "nominal",
    task: "Verdrahte den Stromkreis und wähle den Vorwiderstand so, dass ein LED-Strom zwischen 12 mA und 18 mA fließt. Mehr als 30 mA verträgt die LED nicht.",
    lesson: "Eine LED braucht einen Vorwiderstand, der die Stromstärke begrenzt.",
    explanation: [
      {
        k: "p",
        text: "In Durchlassrichtung fällt an der LED eine fast feste Spannung ab, die Durchlassspannung U_F, hier etwa 2 V. Die übrige Spannung der Spannungsquelle liegt am Vorwiderstand an, und er bestimmt die Stromstärke.",
      },
      { k: "formula", text: "R_V = (U − U_F) / I = (9 V − 2 V) / 0,015 A ≈ 470 Ω" },
      {
        k: "p",
        text: "Ohne Vorwiderstand begrenzt nichts die Stromstärke: Sie stiege weit über die 30 mA, die die LED verträgt.",
      },
    ],
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
        label: "Der LED-Strom liegt zwischen 12 mA und 18 mA",
      },
    ],
  },
];
