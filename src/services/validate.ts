import type { Circuit, Goal, LevelDef, PartType, ToolId } from "../domain/types";
import {
  OPPOSITE,
  isWireKey,
  parsePoint,
  pointKey,
  sideTowards,
  wireEnds,
} from "../engine/circuit";
import { hasPort } from "../engine/parts";

/* Prüft Leveldaten, bevor sie ins Spiel dürfen. Gedacht für alles, was nicht von
   Hand im Repository geschrieben wurde – etwa von einer KI erzeugte Level – und
   als Sicherung für die eigenen Inhalte (content.test.ts). */

const PART_TYPES: ReadonlySet<string> = new Set<PartType>([
  "cross",
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
  "spdt",
]);
const TOOLS: ReadonlySet<string> = new Set<ToolId>([
  ...(PART_TYPES as Set<PartType>),
  "wire",
  "opener",
  "erase",
]);
const GOAL_KINDS = new Set(["on", "wired", "read", "logic", "toggle", "state", "seen", "fuse"]);
const SIDE_SET = new Set(["N", "E", "S", "W"]);
/** Größtes Brett je Richtung; größere Felder sind im Rework vorgesehen, aber nicht grenzenlos. */
export const MAX_BOARD = 40;

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

/* Alle Bauteil-IDs, auf die ein Ziel verweist. */
function goalRefs(g: Goal): string[] {
  switch (g.k) {
    case "on":
    case "wired":
      return [...(g.at ? [g.at] : []), ...(g.ats ?? [])];
    case "read":
      return g.at ? [g.at] : [];
    case "logic":
      return [g.at, ...g.inputs.map((k) => (k[0] === "!" ? k.slice(1) : k))];
    case "toggle":
      return [g.at, ...g.inputs];
    case "state":
      return Object.keys(g.pressed);
    default:
      return [];
  }
}

function validateCircuit(
  c: Circuit,
  W: number,
  H: number,
  walls: Set<string>,
  err: (m: string) => void,
) {
  if (!c || typeof c !== "object" || !c.parts || !c.wires) {
    err("circuit braucht parts und wires");
    return;
  }
  const inBoard = (x: number, y: number) =>
    Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < W && y < H;
  const taken = new Map<string, string>();
  for (const [id, p] of Object.entries(c.parts)) {
    if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(id)) err(`Bauteil-ID „${id}“ ist ungültig`);
    if (!p || !PART_TYPES.has(p.type)) {
      err(`Bauteil ${id}: unbekannter Typ „${p?.type}“`);
      continue;
    }
    if (!inBoard(p.x, p.y)) err(`Bauteil ${id} liegt außerhalb des Felds`);
    const k = pointKey(p.x, p.y);
    if (walls.has(k)) err(`Bauteil ${id} liegt auf einer Wand`);
    if (taken.has(k)) err(`Bauteile ${taken.get(k)} und ${id} liegen beide auf ${k}`);
    taken.set(k, id);
    if (p.type === "spdt" && !SIDE_SET.has(p.dir)) err(`Wechselschalter ${id} braucht dir`);
    if (p.orient !== undefined && p.orient !== "h" && p.orient !== "v")
      err(`Bauteil ${id}: orient muss "h" oder "v" sein`);
  }
  for (const key of Object.keys(c.wires)) {
    if (!isWireKey(key)) {
      err(`Leitung „${key}“ verbindet keine benachbarten Punkte in Normalform (wireKey)`);
      continue;
    }
    const [a, b] = wireEnds(key);
    for (const p of [a, b]) {
      if (!inBoard(...parsePoint(p))) err(`Leitung ${key} reicht über das Feld hinaus`);
      if (walls.has(p)) err(`Leitung ${key} endet auf einer Wand`);
    }
    /* Eine Kante in eine Bauteilseite ohne Anschluss leitet nie – im Level ist das ein
       Entwurfsfehler, kein Rätsel. */
    const s = sideTowards(a, b);
    for (const [p, side] of [
      [a, s],
      [b, OPPOSITE[s]],
    ] as const) {
      const id = taken.get(p);
      if (id && PART_TYPES.has(c.parts[id].type) && !hasPort(c.parts[id], side))
        err(`Leitung ${key} endet an ${id} auf einer Seite ohne Anschluss`);
    }
  }
}

export function validateLevel(level: unknown): ValidationResult {
  const errors: string[] = [];
  const err = (m: string) => errors.push(m);
  const l = level as Partial<LevelDef> | null;
  if (!l || typeof l !== "object") return { ok: false, errors: ["Level ist kein Objekt"] };

  if (typeof l.id !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(l.id))
    err("id muss ein Slug sein (a–z, 0–9, Bindestrich)");
  for (const f of ["name", "task", "lesson"] as const)
    if (typeof l[f] !== "string") err(`${f} fehlt oder ist kein Text`);
  const { W, H } = l;
  const sizeOk =
    Number.isInteger(W) &&
    Number.isInteger(H) &&
    W >= 2 &&
    H >= 2 &&
    W <= MAX_BOARD &&
    H <= MAX_BOARD;
  if (!sizeOk) err(`W und H müssen ganze Zahlen zwischen 2 und ${MAX_BOARD} sein`);

  if (!Array.isArray(l.palette)) err("palette fehlt");
  else for (const t of l.palette) if (!TOOLS.has(t)) err(`unbekanntes Werkzeug „${t}“`);

  const walls = new Set<string>();
  if (l.walls !== undefined) {
    if (!Array.isArray(l.walls)) err("walls muss eine Liste von Punkten sein");
    else
      for (const w of l.walls) {
        try {
          const [x, y] = parsePoint(w);
          if (sizeOk && (x < 0 || y < 0 || x >= W || y >= H)) err(`Wand ${w} liegt außerhalb`);
          walls.add(w);
        } catch {
          err(`Wand „${w}“ ist kein Punkt „x,y“`);
        }
      }
  }

  /* ohne gültige Größe lässt sich die Schaltung nicht sinnvoll prüfen */
  if (sizeOk) {
    validateCircuit(l.circuit, W, H, walls, err);
    if (l.solution !== undefined) validateCircuit(l.solution, W, H, walls, err);
  }

  const parts = l.circuit?.parts ?? {};
  const ref = (id: string, where: string) => {
    if (!parts[id]) err(`${where} verweist auf unbekanntes Bauteil „${id}“`);
  };
  for (const g of l.goals ?? []) {
    if (!g || !GOAL_KINDS.has(g.k)) {
      err(`unbekanntes Ziel „${(g as { k?: string })?.k}“`);
      continue;
    }
    for (const id of goalRefs(g)) ref(id, `Ziel „${g.k}“`);
  }
  for (const id of l.latch?.lit ?? []) ref(id, "latch");
  if (l.ohmLab) ref(l.ohmLab.resistor, "ohmLab");
  if (l.contactLab)
    for (const c of [l.contactLab.closer, l.contactLab.opener]) {
      ref(c?.contact, "contactLab");
      ref(c?.lamp, "contactLab");
    }

  for (const f of ["tips", "concepts"] as const)
    if (l[f] !== undefined && !(Array.isArray(l[f]) && l[f]!.every((s) => typeof s === "string")))
      err(`${f} muss eine Liste von Texten sein`);

  return { ok: errors.length === 0, errors };
}
