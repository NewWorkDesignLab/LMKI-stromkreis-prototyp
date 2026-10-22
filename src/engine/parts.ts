import type { Part, PartId, PartType, Side } from "../domain/types";

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
type ValueKey = "u" | "ri" | "imax" | "r" | "un" | "in" | "vf" | "rs" | "imin";
/** Wert eines Bauteils: eigener Wert, sonst die Vorgabe seines Typs. */
export function P(c: Pick<Part, "type" | ValueKey>, k: ValueKey): number;
export function P(c: Pick<Part, "type" | "values">, k: "values"): number[] | undefined;
export function P(c: Partial<Part>, k: ValueKey | "values"): number | number[] | undefined {
  if (c[k] !== undefined) return c[k];
  const d = (DEF as Record<string, Record<string, number | number[]>>)[c.type];
  return d?.[k];
}

export const TWO = new Set<PartType>([
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
export const CONSUMER = new Set<PartType>(["lamp", "led", "motor", "buzzer"]);
export const IDEAL = new Set<PartType>(["switch", "button", "spdt"]); // widerstandslos, per Union verschmolzen
/* Bauteile ohne eigene Tippfunktion – dort dreht ein Tippen die Lage */
export const ROTATABLE = new Set<PartType>(["lamp", "motor", "buzzer", "ammeter", "voltmeter"]);

export const sidesOf = (c: Pick<Part, "orient">): Side[] =>
  c.orient === "h" ? ["W", "E"] : ["N", "S"];
export const spdtOuts = (c: Pick<Part, "dir">): Side[] =>
  c.dir === "N" || c.dir === "S" ? ["W", "E"] : ["N", "S"];

/** Seiten, an denen ein Bauteil einen Anschluss hat. */
export function portsOf(c: Pick<Part, "type" | "orient" | "dir">): Side[] {
  if (c.type === "cross") return ["N", "E", "S", "W"];
  if (c.type === "spdt") return [c.dir, ...spdtOuts(c)];
  return sidesOf(c);
}

export const hasPort = (c: Pick<Part, "type" | "orient" | "dir">, side: Side): boolean =>
  portsOf(c).includes(side);

/* Knotenname eines Anschlusses. Eine Kreuzung hält waagerecht und senkrecht getrennt,
   der Wechselschalter fasst seine Wurzel unter einem Namen zusammen. */
export function portNode(c: Pick<Part, "type" | "dir">, side: Side, id: PartId): string {
  if (c.type === "cross") return side === "N" || side === "S" ? `cv:${id}` : `ch:${id}`;
  if (c.type === "spdt") return side === c.dir ? `k:${id}:c` : `k:${id}:${side}`;
  return `t:${id}:${side}`;
}
/** Knotenname eines Leitungsknotens (Punkt ohne Bauteil). */
export const wireNode = (p: string) => `w:${p}`;
