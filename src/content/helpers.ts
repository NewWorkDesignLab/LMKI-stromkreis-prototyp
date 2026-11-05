import type { Frame, Part, PartId, PointKey, ToolId, Wire, WireKey } from "../domain/types";
import { pointKey, wiresAlong } from "../engine/circuit";
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

/** Kreuzschalter als fest verdrahteter Block, 3 × 6 Punkte ab (x, y) links oben.

    Ein Kreuzschalter hat vier Anschlüsse; ein Rasterpunkt hat aber je Seite nur einen.
    Deshalb besteht er hier aus zwei gekoppelten Wechselschaltern (gleiche `link`-ID, sie
    springen gemeinsam um) und einer Kreuzung – so, wie er innen aufgebaut ist:

    ```
         x   x+1  x+2
    y    ┌────────●──── c
    y+1  A        │          A, B: Wechselschalter, Wurzel nach W
    y+2  │        │          ┼   : Kreuzung
    y+3  ●────────┼──── d
    y+4  B        │          Stellung 0: a–c, b–d (gerade durch)
    y+5  └────────┘          Stellung 1: a–d, b–c (über Kreuz)
    ```

    Angeschlossen wird an `ports`: a und b an der Westseite der Wechselschalter, c am
    Leitungsknoten oben rechts, d an der Ostseite der Kreuzung. */
export function kreuzschalter(
  x: number,
  y: number,
  ids: { a: PartId; b: PartId; cross: PartId; link: string },
): {
  parts: Record<PartId, Part>;
  wires: Record<WireKey, Wire>;
  frame: Frame;
  ports: { a: PointKey; b: PointKey; c: PointKey; d: PointKey };
} {
  const p = (dx: number, dy: number) => pointKey(x + dx, y + dy);
  const spdt = (dy: number): Part => ({
    type: "spdt",
    x,
    y: y + dy,
    dir: "W",
    pos: 0,
    link: ids.link,
  });
  return {
    parts: {
      [ids.a]: spdt(1),
      [ids.b]: spdt(4),
      [ids.cross]: { type: "cross", x: x + 2, y: y + 3 },
    },
    wires: wires(
      [
        `${p(0, 1)} ${p(0, 0)} ${p(2, 0)} ${p(2, 5)} ${p(0, 5)} ${p(0, 4)}`,
        `${p(0, 1)} ${p(0, 4)}`,
        `${p(0, 3)} ${p(2, 3)}`,
      ],
      { lock: true },
    ),
    frame: { x, y, w: 3, h: 6, label: "Kreuzschalter" },
    ports: { a: p(0, 1), b: p(0, 4), c: p(2, 0), d: p(2, 3) },
  };
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
