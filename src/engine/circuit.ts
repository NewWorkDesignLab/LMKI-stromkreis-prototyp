/* Grundbausteine des Schaltungsmodells: Punkte, Leitungskanten, Bauteil-Kennungen.
   Alles hier ist rein und klein – Simulation, Bearbeitung, Inhalte und Oberfläche
   bauen darauf auf, statt Schlüssel selbst zusammenzusetzen oder zu zerlegen. */
import type { Circuit, PartId, PartType, PointKey, Side, WireKey } from "../domain/types";

export const pointKey = (x: number, y: number): PointKey => `${x},${y}`;

export function parsePoint(p: PointKey): [number, number] {
  const m = /^(-?\d+),(-?\d+)$/.exec(p);
  if (!m) throw new Error(`Kein Rasterpunkt: „${p}“`);
  return [+m[1], +m[2]];
}

export const SIDES: readonly Side[] = ["N", "E", "S", "W"];
export const STEP: Record<Side, readonly [number, number]> = {
  N: [0, -1],
  E: [1, 0],
  S: [0, 1],
  W: [-1, 0],
};
export const OPPOSITE: Record<Side, Side> = { N: "S", S: "N", E: "W", W: "E" };

export function neighbor(p: PointKey, s: Side): PointKey {
  const [x, y] = parsePoint(p);
  return pointKey(x + STEP[s][0], y + STEP[s][1]);
}

/** Seite von a, auf der b liegt – oder null, wenn die beiden keine Nachbarn sind. */
export function sideTowards(a: PointKey, b: PointKey): Side | null {
  const [ax, ay] = parsePoint(a),
    [bx, by] = parsePoint(b);
  for (const s of SIDES) if (ax + STEP[s][0] === bx && ay + STEP[s][1] === by) return s;
  return null;
}

/* Kanonische Reihenfolge: der linke bzw. obere Punkt zuerst. Damit hat jede Kante
   genau einen Schlüssel, und `WireFlow.dir` ist eindeutig auf ihn bezogen. */
export function wireKey(a: PointKey, b: PointKey): WireKey {
  const s = sideTowards(a, b);
  if (!s) throw new Error(`Leitung zwischen Nicht-Nachbarn: ${a} – ${b}`);
  return s === "E" || s === "S" ? `${a}|${b}` : `${b}|${a}`;
}

export function wireEnds(k: WireKey): [PointKey, PointKey] {
  const i = k.indexOf("|");
  if (i < 0) throw new Error(`Kein Leitungsschlüssel: „${k}“`);
  return [k.slice(0, i), k.slice(i + 1)];
}

/** Ob ein Schlüssel eine gültige Kante beschreibt (Format, Nachbarschaft, Reihenfolge). */
export function isWireKey(k: string): boolean {
  try {
    const [a, b] = wireEnds(k);
    return wireKey(a, b) === k;
  } catch {
    return false;
  }
}

/** Die Leitungen, die an einem Punkt enden, je Seite. */
export function wiresAt(c: Circuit, p: PointKey): { side: Side; key: WireKey }[] {
  const out: { side: Side; key: WireKey }[] = [];
  for (const side of SIDES) {
    const key = wireKey(p, neighbor(p, side));
    if (c.wires[key]) out.push({ side, key });
  }
  return out;
}

/* Punkt → Bauteil. Je Bauteil-Objekt einmal gebaut: Schaltungen werden nie verändert,
   nur ersetzt, also bleibt der Eintrag gültig, solange es das Objekt gibt. */
const indexCache = new WeakMap<Circuit["parts"], Map<PointKey, PartId>>();
export function partIndex(c: Circuit): Map<PointKey, PartId> {
  let idx = indexCache.get(c.parts);
  if (!idx) {
    idx = new Map();
    for (const [id, p] of Object.entries(c.parts)) idx.set(pointKey(p.x, p.y), id);
    indexCache.set(c.parts, idx);
  }
  return idx;
}

export const partAt = (c: Circuit, p: PointKey): PartId | undefined => partIndex(c).get(p);

/* Kennbuchstaben nach IEC 81346-2, wo es einen passenden gibt. Nur Kennung – die
   Oberfläche zeigt sie (noch) nicht an. */
export const ID_PREFIX: Record<PartType, string> = {
  battery: "G",
  lamp: "E",
  led: "P",
  resistor: "R",
  motor: "M",
  buzzer: "H",
  fuse: "F",
  ammeter: "PA",
  voltmeter: "PV",
  switch: "S",
  button: "S",
  spdt: "S",
  cross: "X",
};

/** Kleinste freie Kennung für ein neues Bauteil dieses Typs. */
export function nextPartId(c: Circuit, type: PartType): PartId {
  const prefix = ID_PREFIX[type];
  for (let n = 1; ; n++) if (!c.parts[`${prefix}${n}`]) return `${prefix}${n}`;
}

export const emptyCircuit = (): Circuit => ({ parts: {}, wires: {} });

export const cloneCircuit = (c: Circuit): Circuit => structuredClone(c);

/** Leitungen entlang eines Linienzugs: "0,1 0,0 4,0" ergibt 0,1–0,0 und 0,0–1,0 … 3,0–4,0.
    Jedes Teilstück muss waagerecht oder senkrecht verlaufen. */
export function wiresAlong(path: string): WireKey[] {
  const pts = path.split(/\s+/).filter(Boolean).map(parsePoint);
  const out: WireKey[] = [];
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1],
      [bx, by] = pts[i];
    if (ax !== bx && ay !== by) throw new Error(`Linienzug nicht achsparallel: ${path}`);
    const dx = Math.sign(bx - ax),
      dy = Math.sign(by - ay);
    for (let x = ax, y = ay; x !== bx || y !== by; x += dx, y += dy)
      out.push(wireKey(pointKey(x, y), pointKey(x + dx, y + dy)));
  }
  return out;
}
