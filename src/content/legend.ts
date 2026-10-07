import type { Cell } from "../domain/types";

/* Symbol-Legende: Schaltzeichen, Name und Kurzbeschreibung. */
export type LegendEntry = [cell: Cell, name: string, description: string];

export const LEGEND: LegendEntry[] = [
  [{ type: "battery", orient: "h" }, "Spannungsquelle", "9 V, mit kleinem Innenwiderstand"],
  [{ type: "lamp", orient: "h" }, "Lampe", "Verbraucher; Schaltzeichen: Kreis mit Kreuz"],
  [{ type: "resistor", orient: "h" }, "Widerstand", "begrenzt den Strom"],
  [
    { type: "led", orient: "h" },
    "LED",
    "leitet nur in Durchlassrichtung (Pfeil), braucht Vorwiderstand",
  ],
  [{ type: "switch", orient: "h", closed: false }, "Schalter", "bleibt in seiner Stellung"],
  [
    { type: "switch", orient: "h", closed: true, nc: true },
    "Öffner",
    "Ruhekontakt: leitet im Ruhezustand, betätigt trennt er",
  ],
  [{ type: "button", orient: "h", closed: false }, "Taster", "leitet nur während der Betätigung"],
  [{ type: "spdt", dir: "W", pos: 0 }, "Wechselschalter", "schaltet zwischen zwei Ausgängen um"],
  [{ type: "fuse", orient: "h" }, "Sicherung", "trennt bei Überstrom, danach von Hand einschalten"],
  [{ type: "ammeter", orient: "h" }, "Amperemeter", "misst Strom – IN REIHE einbauen"],
  [{ type: "voltmeter", orient: "h" }, "Voltmeter", "misst Spannung – PARALLEL einbauen"],
  [{ type: "motor", orient: "h" }, "Motor", "wandelt Strom in Bewegung"],
  [{ type: "buzzer", orient: "h" }, "Summer", "akustischer Verbraucher"],
  [{ type: "cross" }, "Kreuzung", "Leitungen kreuzen sich OHNE Verbindung"],
];
