import type { ToolId } from "../domain/types";

/* Anzeige der Werkzeuge: Name, Kurzinfo und Gruppe in der Palette. Welche Werkzeuge es
   gibt und wo sie wirken, steht in engine/editing.ts. */

export type ToolGroup = "source" | "switching" | "consumer" | "limit" | "meter" | "wiring";

export const TOOLS: Record<ToolId, { label: string; info: string; group: ToolGroup }> = {
  wire: { label: "Leitung ziehen", info: "Punkt für Punkt verbinden", group: "wiring" },
  erase: { label: "Löschen", info: "Leitungen und eigene Bauteile", group: "wiring" },
  cross: { label: "Kreuzung", info: "Leitungen kreuzen ohne Verbindung", group: "wiring" },
  battery: { label: "Spannungsquelle", info: "treibt den Strom an (+ / −)", group: "source" },
  switch: { label: "Schalter", info: "bleibt in seiner Stellung", group: "switching" },
  opener: { label: "Öffner", info: "trennt, wenn betätigt", group: "switching" },
  button: { label: "Taster", info: "leitet nur, solange gedrückt", group: "switching" },
  spdt: { label: "Wechselschalter", info: "schaltet zwischen zwei Wegen um", group: "switching" },
  lamp: { label: "Lampe", info: "leuchtet, wenn Strom fließt", group: "consumer" },
  led: { label: "LED", info: "leitet nur in einer Richtung", group: "consumer" },
  motor: { label: "Motor", info: "dreht ab einem Mindeststrom", group: "consumer" },
  buzzer: { label: "Summer", info: "summt ab einem Mindeststrom", group: "consumer" },
  resistor: { label: "Widerstand", info: "begrenzt den Strom", group: "limit" },
  fuse: { label: "Sicherung", info: "trennt bei zu hohem Strom", group: "limit" },
  ammeter: { label: "Amperemeter", info: "misst Strom – in Reihe", group: "meter" },
  voltmeter: { label: "Voltmeter", info: "misst Spannung – parallel", group: "meter" },
};

/* Farben je Gruppe, nur in der Palette: auf dem Brett bleiben die Schaltzeichen
   normgerecht schwarz (entschieden 2026-10-23). Die Farbe hilft beim Finden, das
   Symbol in der Kachel beim Wiedererkennen auf dem Brett. Tailwind braucht die
   Klassen als ganze Wörter im Quelltext, deshalb ausgeschrieben statt zusammengesetzt. */
export const GROUPS: Record<
  ToolGroup,
  { label: string; tile: string; active: string; dot: string }
> = {
  source: {
    label: "Quellen",
    tile: "border-red-200 bg-red-50 text-red-950 hover:border-red-400",
    active: "border-red-600 ring-2 ring-red-600",
    dot: "bg-red-500",
  },
  switching: {
    label: "Schalten",
    tile: "border-teal-200 bg-teal-50 text-teal-950 hover:border-teal-400",
    active: "border-teal-700 ring-2 ring-teal-700",
    dot: "bg-teal-600",
  },
  consumer: {
    label: "Verbraucher",
    tile: "border-amber-200 bg-amber-50 text-amber-950 hover:border-amber-400",
    active: "border-amber-600 ring-2 ring-amber-600",
    dot: "bg-amber-500",
  },
  limit: {
    label: "Begrenzen & Schützen",
    tile: "border-violet-200 bg-violet-50 text-violet-950 hover:border-violet-400",
    active: "border-violet-600 ring-2 ring-violet-600",
    dot: "bg-violet-500",
  },
  meter: {
    label: "Messen",
    tile: "border-sky-200 bg-sky-50 text-sky-950 hover:border-sky-400",
    active: "border-sky-600 ring-2 ring-sky-600",
    dot: "bg-sky-500",
  },
  wiring: {
    label: "Leitungen",
    tile: "border-stone-200 bg-white text-stone-900 hover:border-stone-400",
    active: "border-stone-800 ring-2 ring-stone-800",
    dot: "bg-stone-500",
  },
};

/** Reihenfolge der Gruppen in der Palette: vom Antrieb über das Steuern zum Messen. */
export const GROUP_ORDER: ToolGroup[] = [
  "source",
  "switching",
  "consumer",
  "limit",
  "meter",
  "wiring",
];
