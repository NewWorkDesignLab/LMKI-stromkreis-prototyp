import type { CellType, LevelDef, ToolId } from "../domain/types";

/* Prüft Leveldaten, bevor sie ins Spiel dürfen. Gedacht für alles, was nicht von
   Hand im Repository geschrieben wurde – etwa von einer KI erzeugte Level. */

const CELL_TYPES: ReadonlySet<string> = new Set<CellType>([
  "wire",
  "cross",
  "wall",
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
  "wire",
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
  "opener",
  "erase",
]);
const GOAL_KINDS = new Set(["on", "wired", "read", "logic", "toggle", "state", "seen", "fuse"]);

export interface ValidationResult {
  ok: boolean;
  errors: string[];
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
  const sizeOk = Number.isInteger(W) && Number.isInteger(H);
  if (!sizeOk || W! < 2 || H! < 2 || W! > 20 || H! > 20)
    err("W und H müssen ganze Zahlen zwischen 2 und 20 sein");

  if (!Array.isArray(l.palette)) err("palette fehlt");
  else for (const t of l.palette) if (!TOOLS.has(t)) err(`unbekanntes Werkzeug „${t}“`);

  if (!l.cells || typeof l.cells !== "object") err("cells fehlt");
  else
    for (const [k, c] of Object.entries(l.cells)) {
      const m = /^(\d+),(\d+)$/.exec(k);
      if (!m) {
        err(`Zellschlüssel „${k}“ ist nicht „x,y“`);
        continue;
      }
      if (sizeOk && (+m[1] >= W! || +m[2] >= H!)) err(`Zelle ${k} liegt außerhalb des Felds`);
      if (!c || !CELL_TYPES.has(c.type)) err(`Zelle ${k}: unbekannter Typ „${c?.type}“`);
    }

  for (const g of l.goals ?? [])
    if (!g || !GOAL_KINDS.has(g.k)) err(`unbekanntes Ziel „${(g as { k?: string })?.k}“`);
  for (const f of ["tips", "concepts"] as const)
    if (l[f] !== undefined && !(Array.isArray(l[f]) && l[f]!.every((s) => typeof s === "string")))
      err(`${f} muss eine Liste von Texten sein`);

  return { ok: errors.length === 0, errors };
}
