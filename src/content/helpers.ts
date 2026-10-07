import type { Cell, Grid, ToolId } from "../domain/types";

/* Kurzschreibweisen für Leveldaten: "1,1 2,1 3,1" wird zu einer Zellgruppe. */
const spread = (str: string, obj: Cell): Grid => {
  const o: Grid = {};
  str
    .split(/\s+/)
    .filter(Boolean)
    .forEach((k) => {
      o[k] = { ...obj };
    });
  return o;
};
export const wall = (s: string) => spread(s, { type: "wall" });
export const wire = (s: string) => spread(s, { type: "wire" });
export const lockw = (s: string) => spread(s, { type: "wire", lock: true });
/** Mindestausstattung: Leitungen ziehen und löschen. */
export const BASE: ToolId[] = ["wire", "erase"];
