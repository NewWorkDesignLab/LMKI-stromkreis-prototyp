import type { Cell, CellKey, CellType, Grid, Side } from "../domain/types";

export const EPS = 1e-5;

/* Bauteil-Vorgaben. r = Widerstand, un/in = Nennwerte, ri = Innenwiderstand */
export const DEF = {
  battery: { u: 9, ri: 0.5, imax: 1.0 },
  lamp: { r: 90, un: 9, in: 0.1 },
  resistor: { r: 220, values: [100, 220, 470, 1000] }, // Level dürfen eigene Reihen setzen
  led: { vf: 2, rs: 25, in: 0.015, imax: 0.03 },
  motor: { r: 60, imin: 0.04 },
  buzzer: { r: 120, imin: 0.03 },
  fuse: { r: 0.02, imax: 0.5 },
  ammeter: { r: 0.005 },
  voltmeter: { r: 1e6 },
};
export const P = (c: Cell, k: string): any =>
  c && (c as any)[k] !== undefined ? (c as any)[k] : ((DEF as any)[c.type] || {})[k];

export const TWO = new Set<CellType>([
  "battery",
  "lamp",
  "resistor",
  "led",
  "motor",
  "buzzer",
  "fuse",
  "ammeter",
  "voltmeter",
  "switch",
  "button",
]);
export const CONSUMER = new Set<CellType>(["lamp", "led", "motor", "buzzer"]);
export const IDEAL = new Set<CellType>(["switch", "button", "spdt"]); // widerstandslos, per Union verschmolzen
/* Bauteile ohne eigene Tippfunktion – dort dreht ein Tippen die Lage */
export const ROTATABLE = new Set<CellType>(["lamp", "motor", "buzzer", "ammeter", "voltmeter"]);

export const sidesOf = (c: Cell): Side[] => (c.orient === "h" ? ["W", "E"] : ["N", "S"]);
export const spdtOuts = (c: Cell): Side[] =>
  c.dir === "N" || c.dir === "S" ? ["W", "E"] : ["N", "S"];

export function hasPort(c: Cell | undefined, side: Side): boolean {
  if (!c) return false;
  if (c.type === "wire" || c.type === "cross") return true;
  if (c.type === "spdt") return side === c.dir || spdtOuts(c).includes(side);
  if (TWO.has(c.type)) return sidesOf(c).includes(side);
  return false;
}
/* Wie viele Anschlüsse hat eine Leitungszelle je Achse? Entscheidet, ob ein
   Bauteil in der eingestellten Orientierung dort überhaupt passt. */
export function wireLinks(grid: Grid, x: number, y: number) {
  const h =
    (hasPort(grid[`${x - 1},${y}`], "E") ? 1 : 0) + (hasPort(grid[`${x + 1},${y}`], "W") ? 1 : 0);
  const v =
    (hasPort(grid[`${x},${y - 1}`], "S") ? 1 : 0) + (hasPort(grid[`${x},${y + 1}`], "N") ? 1 : 0);
  return { h, v };
}

/* Knotenname eines Anschlusses. Leitungszellen fassen alle 4 Seiten zusammen,
   eine Kreuzung hält waagerecht und senkrecht getrennt. */
export function nodeId(c: Cell, side: Side, key: CellKey): string {
  if (c.type === "wire") return `w:${key}`;
  if (c.type === "cross") return side === "N" || side === "S" ? `cv:${key}` : `ch:${key}`;
  if (c.type === "spdt") return side === c.dir ? `k:${key}:c` : `k:${key}:${side}`;
  return `t:${key}:${side}`;
}
