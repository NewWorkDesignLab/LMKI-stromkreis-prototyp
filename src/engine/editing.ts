/* Änderungen am Spielfeld als reine Funktionen: Feld rein, neues Feld raus.
   Die Oberfläche ruft sie nur auf; so lassen sie sich ohne React prüfen und
   später auch von einer KI-Schnittstelle benutzen. */
import type { Cell, CellKey, CellType, Grid, Orient, ToolId } from "../domain/types";
import { P, ROTATABLE, wireLinks } from "./parts";

export type PlayMode = "level" | "sandbox";

export const cloneGrid = (g: Grid): Grid => JSON.parse(JSON.stringify(g));

export const PLACEABLE = new Set<ToolId>([
  "opener",
  "cross",
  "battery",
  "lamp",
  "led",
  "resistor",
  "switch",
  "button",
  "spdt",
  "motor",
  "buzzer",
  "fuse",
  "ammeter",
  "voltmeter",
]);
/* Messgeräte setzt man im Level genau einmal ein und verdrahtet sie dann –
   siehe den Werkzeugwechsel in onDown. */
export const METER = new Set<ToolId>(["ammeter", "voltmeter"]);

/* Vorschau in der Werkzeugleiste. „opener“ ist kein eigener Zelltyp, sondern ein
   Schalter mit nc – ohne diese Übersetzung bliebe die Kachel leer. */
export function previewCell(t: ToolId, orient: Orient): Cell {
  const c: Cell = {
    type: t as CellType,
    orient,
    dir: orient === "h" ? "W" : "N",
    pos: 0,
    closed: false,
  };
  if (t === "opener") {
    c.type = "switch";
    c.nc = true;
    c.closed = true;
  }
  return c;
}

/* Ob an dieser Stelle überhaupt gesetzt werden darf. Steht außerhalb von
   placeComp, weil onDown die Antwort schon vor dem setGrid braucht: nur eine
   wirklich gelungene Platzierung darf das Werkzeug umschalten. */
export function canPlace(grid: Grid, x: number, y: number, type: ToolId, orient: Orient): boolean {
  const old = grid[`${x},${y}`];
  /* Ein Bauteil darf eine gezogene Leitung ersetzen – sonst müsste man sie erst
     löschen. Fest verlegte Leitungen und andere Bauteile bleiben geschützt. */
  if (old && !(old.type === "wire" && !old.lock)) return false;
  /* Die Orientierung wird nicht automatisch übernommen: das Bauteil passt nur
     auf eine Leitung, die in der eingestellten Richtung angeschlossen ist.
     Eine Leitung ohne Anschluss nimmt jede Richtung an. */
  if (old && type !== "cross") {
    const l = wireLinks(grid, x, y);
    if ((l.h || l.v) && !(orient === "h" ? l.h : l.v)) return false;
  }
  return true;
}

/* Leitung ziehen: nur auf freien Zellen. */
export function wireAt(grid: Grid, x: number, y: number): Grid {
  const k = `${x},${y}`;
  return grid[k] ? grid : { ...grid, [k]: { type: "wire", user: true } };
}

/* Im Level lassen sich nur gezogene Leitungen und selbst gesetzte Bauteile löschen. */
export function eraseAt(grid: Grid, x: number, y: number, mode: PlayMode): Grid {
  const k = `${x},${y}`,
    c = grid[k];
  if (!c) return grid;
  if (mode === "level" && !((c.type === "wire" && !c.lock) || c.user)) return grid;
  const n = { ...grid };
  delete n[k];
  return n;
}

export function placeAt(grid: Grid, x: number, y: number, type: ToolId, orient: Orient): Grid {
  const k = `${x},${y}`;
  if (!canPlace(grid, x, y, type, orient)) return grid;
  const cell: Cell = { type: type as CellType, user: true };
  if (type !== "cross") cell.orient = orient;
  if (type === "switch" || type === "button") cell.closed = false;
  /* Der Öffner ist elektrisch ein gewöhnlicher Schalter – er startet nur
     geschlossen und trägt das andere Symbol. */
  if (type === "opener") {
    cell.type = "switch";
    cell.nc = true;
    cell.closed = true;
  }
  if (type === "spdt") {
    cell.dir = orient === "h" ? "W" : "N";
    cell.pos = 0;
  }
  return { ...grid, [k]: cell };
}

export interface Activation {
  grid: Grid;
  /** Gesetzt, wenn ein Taster gedrückt wurde und beim Loslassen zurückfedern muss. */
  pressedKey?: CellKey;
}

/* Antippen eines Bauteils: Schalten, Drehen, Wert weiterschalten – je nach Typ. */
export function activateAt(grid: Grid, x: number, y: number, mode: PlayMode): Activation {
  const k = `${x},${y}`,
    c = grid[k];
  if (!c) return { grid };
  if (c.type === "switch") return { grid: { ...grid, [k]: { ...c, closed: !c.closed } } };
  /* Betätigt: ein Schließer leitet, ein Öffner trennt. closed heißt „leitet“. */
  if (c.type === "button")
    return { grid: { ...grid, [k]: { ...c, closed: !c.nc } }, pressedKey: k };
  /* Gekoppelte Wechselschalter (Kreuzschalter): beide Zellen springen gemeinsam um. */
  if (c.type === "spdt") {
    const pos = c.pos ? 0 : 1;
    if (!c.link) return { grid: { ...grid, [k]: { ...c, pos } } };
    const n = { ...grid };
    for (const [kk, cc] of Object.entries(grid)) if (cc.link === c.link) n[kk] = { ...cc, pos };
    return { grid: n };
  }
  /* ausgelöste Sicherung wieder einschalten – hält die Ursache noch an,
     löst sie sofort wieder aus */
  if (c.type === "fuse") return { grid: c.open ? { ...grid, [k]: { ...c, open: false } } : grid };
  /* Drehen per Tippen: beim Frei bauen immer, im Level nur bei selbst gesetzten
     Bauteilen. Was das Level vorgibt, bleibt liegen – dort ist die Lage Teil
     der Aufgabe (etwa das fest verbaute Amperemeter in „Der Vorwiderstand“). */
  if (ROTATABLE.has(c.type) && (mode === "sandbox" || c.user))
    return { grid: { ...grid, [k]: { ...c, orient: c.orient === "h" ? "v" : "h" } } };
  const vals: number[] | undefined = P(c, "values");
  if (vals) {
    /* liegt der aktuelle Wert nicht in der Reihe, weiter zum nächstgrößeren */
    const r: number = P(c, "r"),
      i = vals.indexOf(r);
    const next = i >= 0 ? vals[(i + 1) % vals.length] : (vals.find((v) => v > r) ?? vals[0]);
    return { grid: { ...grid, [k]: { ...c, r: next } } };
  }
  /* LEDs sind immer drehbar, Quellen nur wo das Level es vorsieht */
  if (c.type === "led" || c.flip) return { grid: { ...grid, [k]: { ...c, rev: !c.rev } } };
  return { grid };
}

/* Taster loslassen: federt in die Ruhelage zurück. */
export function releaseAt(grid: Grid, k: CellKey): Grid {
  return grid[k] ? { ...grid, [k]: { ...grid[k], closed: !!grid[k].nc } } : grid;
}

/* Ausgelöste Sicherungen bleiben im Feld offen, bis sie angetippt werden. */
export function latchTripped(grid: Grid, tripped: Iterable<CellKey>): Grid {
  const blown = [...tripped].filter((k) => grid[k] && !grid[k].open);
  if (!blown.length) return grid;
  const n = { ...grid };
  for (const k of blown) n[k] = { ...n[k], open: true };
  return n;
}
