import type { PointKey, ToolId, Wire, WireKey } from "../domain/types";
import { wiresAlong } from "../engine/circuit";
import type { LegacyCell, LegacyGrid } from "./legacy";

/** Mindestausstattung: Leitungen ziehen und löschen. */
export const BASE: ToolId[] = ["wire", "erase"];

/* ---------- Leveldaten im heutigen Format ---------- */

/** Punkte als Liste: "1,1 2,1 3,1". */
export const points = (s: string): PointKey[] => s.split(/\s+/).filter(Boolean);

/** Leitungen entlang von Linienzügen, je Linienzug ein Text: wires("0,1 0,0 4,0 4,1", …). */
export function wires(paths: string[], wire: Wire = {}): Record<WireKey, Wire> {
  const out: Record<WireKey, Wire> = {};
  for (const p of paths) for (const k of wiresAlong(p)) out[k] = { ...wire };
  return out;
}

/* ---------- Altformat (content/legacy.ts) ---------- */

/* "1,1 2,1 3,1" wird zu einer Zellgruppe. */
const spread = (str: string, obj: LegacyCell): LegacyGrid => {
  const o: LegacyGrid = {};
  for (const k of points(str)) o[k] = { ...obj };
  return o;
};
export const wall = (s: string) => spread(s, { type: "wall" });
export const wire = (s: string) => spread(s, { type: "wire" });
export const lockw = (s: string) => spread(s, { type: "wire", lock: true });
