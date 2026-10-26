import type {
  Block,
  BuildStep,
  Choice,
  Circuit,
  Goal,
  LevelDef,
  PartType,
  Step,
  ToolId,
  WidgetId,
} from "../domain/types";
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
const GOAL_KINDS = new Set([
  "on",
  "wired",
  "read",
  "measure",
  "logic",
  "toggle",
  "state",
  "seen",
  "fuse",
]);
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
    case "measure":
      return [g.of];
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

const isText = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const isTextList = (v: unknown) => Array.isArray(v) && v.every((x) => typeof x === "string");
const SLUG = /^[a-z0-9][a-z0-9-]*$/;

const WIDGETS: Record<WidgetId, true> = {
  "uri-dreieck": true,
  kuehlschrank: true,
  lichtschalter: true,
};

/* Bausteine: Art bekannt, Texte vorhanden. Bilder und Videos nur über http(s) oder
   relative Pfade – kein javascript:, kein data: mit Skript. */
function validateBlocks(blocks: unknown, where: string, err: (m: string) => void) {
  if (blocks === undefined) return;
  if (!Array.isArray(blocks)) return err(`${where}: blocks muss eine Liste sein`);
  const safeUrl = (u: unknown) => typeof u === "string" && /^(https?:\/\/|\/|\.\/)/.test(u);
  blocks.forEach((b: Block, i) => {
    const at = `${where}, Baustein ${i + 1}`;
    switch (b?.k) {
      case "p":
      case "note":
      case "formula":
        if (!isText(b.text)) err(`${at}: text fehlt`);
        break;
      case "list":
        if (!isTextList(b.items) || !b.items.length) err(`${at}: items muss Texte enthalten`);
        break;
      case "image":
        if (!safeUrl(b.src) || !isText(b.alt))
          err(`${at}: Bild braucht src (http/https/relativ) und alt`);
        break;
      case "video":
        if (!safeUrl(b.src) || !isText(b.title)) err(`${at}: Video braucht src und title`);
        break;
      case "widget":
        if (!WIDGETS[b.widget]) err(`${at}: unbekannte Anschauung „${b.widget}“`);
        break;
      default:
        err(`${at}: unbekannte Art „${(b as { k?: string })?.k}“`);
    }
  });
}

function validateChoices(choices: unknown, where: string, err: (m: string) => void): Set<string> {
  const ids = new Set<string>();
  if (!Array.isArray(choices) || choices.length < 2) {
    err(`${where}: mindestens zwei Antwortmöglichkeiten`);
    return ids;
  }
  for (const c of choices as Choice[]) {
    if (!c || !isText(c.id) || !isText(c.text)) err(`${where}: Antwort braucht id und text`);
    else if (ids.has(c.id)) err(`${where}: Antwort-ID „${c.id}“ doppelt`);
    else ids.add(c.id);
  }
  return ids;
}

function validateBuild(l: BuildStep, where: string, err: (m: string) => void) {
  const e = (m: string) => err(`${where}: ${m}`);
  if (!isText(l.task)) e("task fehlt");
  const { W, H } = l;
  const sizeOk =
    Number.isInteger(W) &&
    Number.isInteger(H) &&
    W >= 2 &&
    H >= 2 &&
    W <= MAX_BOARD &&
    H <= MAX_BOARD;
  if (!sizeOk) e(`W und H müssen ganze Zahlen zwischen 2 und ${MAX_BOARD} sein`);

  if (!Array.isArray(l.palette)) e("palette fehlt");
  else for (const t of l.palette) if (!TOOLS.has(t)) e(`unbekanntes Werkzeug „${t}“`);
  if (l.stock !== undefined) {
    if (!l.stock || typeof l.stock !== "object") e("stock muss ein Objekt sein");
    else
      for (const [t, n] of Object.entries(l.stock)) {
        if (!Array.isArray(l.palette) || !l.palette.includes(t as ToolId))
          e(`stock: „${t}“ steht nicht in der Palette`);
        if (!Number.isInteger(n) || n < 1) e(`stock: „${t}“ braucht eine ganze Zahl ab 1`);
      }
  }

  const walls = new Set<string>();
  if (l.walls !== undefined) {
    if (!Array.isArray(l.walls)) e("walls muss eine Liste von Punkten sein");
    else
      for (const w of l.walls) {
        try {
          const [x, y] = parsePoint(w);
          if (sizeOk && (x < 0 || y < 0 || x >= W || y >= H)) e(`Wand ${w} liegt außerhalb`);
          walls.add(w);
        } catch {
          e(`Wand „${w}“ ist kein Punkt „x,y“`);
        }
      }
  }

  /* ohne gültige Größe lässt sich die Schaltung nicht sinnvoll prüfen */
  if (sizeOk) {
    validateCircuit(l.circuit, W, H, walls, e);
    if (l.solution !== undefined) validateCircuit(l.solution, W, H, walls, e);
  }

  const parts = l.circuit?.parts ?? {};
  const ref = (id: string, what: string) => {
    if (!parts[id]) e(`${what} verweist auf unbekanntes Bauteil „${id}“`);
  };
  const measureIds = new Set<string>();
  for (const g of l.goals ?? []) {
    if (!g || !GOAL_KINDS.has(g.k)) {
      e(`unbekanntes Ziel „${(g as { k?: string })?.k}“`);
      continue;
    }
    for (const id of goalRefs(g)) ref(id, `Ziel „${g.k}“`);
    if (g.k === "measure") {
      if (!isText(g.id)) e("Ziel „measure“: id fehlt");
      else if (measureIds.has(g.id)) e(`Ziel „measure“: id „${g.id}“ kommt doppelt vor`);
      else measureIds.add(g.id);
      if (!isText(g.label)) e("Ziel „measure“: label fehlt");
      const meter =
        g.quantity === "current" ? "ammeter" : g.quantity === "voltage" ? "voltmeter" : null;
      if (!meter) e(`Ziel „measure“: quantity „${g.quantity}“ ist weder current noch voltage`);
      else if (!l.palette?.includes(meter) && !Object.values(parts).some((p) => p.type === meter))
        e(`Ziel „measure“ braucht ein ${meter}, das weder in der Palette noch im Brett liegt`);
      const units = g.quantity === "current" ? ["A", "mA"] : ["V", "mV"];
      if (!units.includes(g.unit))
        e(
          `Ziel „measure“: unit „${g.unit}“ passt nicht zu ${g.quantity} (${units.join(" oder ")})`,
        );
    }
  }
  for (const id of l.latch?.lit ?? []) ref(id, "latch");
  if (l.contactLab)
    for (const c of [l.contactLab.closer, l.contactLab.opener]) {
      ref(c?.contact, "contactLab");
      ref(c?.lamp, "contactLab");
    }
  if (l.tips !== undefined && !isTextList(l.tips)) e("tips muss eine Liste von Texten sein");
}

function validateStep(st: Step, earlier: Step[], err: (m: string) => void) {
  const where = `Schritt „${st.id}“`;
  if (st.title !== undefined && !isText(st.title)) err(`${where}: title ist leer`);
  if (st.concepts !== undefined && !isTextList(st.concepts))
    err(`${where}: concepts muss eine Liste von Texten sein`);
  switch (st.kind) {
    case "context":
      if (!Array.isArray(st.blocks) || !st.blocks.length) err(`${where}: blocks fehlt`);
      validateBlocks(st.blocks, where, err);
      break;
    case "predict": {
      if (!isText(st.question)) err(`${where}: question fehlt`);
      validateBlocks(st.blocks, where, err);
      const ids = validateChoices(st.choices, where, err);
      if (st.correct !== undefined && !ids.has(st.correct))
        err(`${where}: correct „${st.correct}“ ist keine der Antworten`);
      break;
    }
    case "build":
      validateBuild(st, where, err);
      break;
    case "quiz": {
      if (!isText(st.question)) err(`${where}: question fehlt`);
      validateBlocks(st.blocks, where, err);
      validateBlocks(st.explanation, `${where} (Lösungsweg)`, err);
      const a = st.answer;
      if (a?.k === "choice") {
        const ids = validateChoices(a.choices, where, err);
        if (!Array.isArray(a.correct) || !a.correct.length)
          err(`${where}: mindestens eine richtige Antwort`);
        else
          for (const c of a.correct)
            if (!ids.has(c)) err(`${where}: „${c}“ ist keine der Antworten`);
      } else if (a?.k === "number") {
        if (!Number.isFinite(a.value)) err(`${where}: value muss eine Zahl sein`);
        if (!isText(a.unit)) err(`${where}: unit fehlt`);
        if (a.tolerance !== undefined && !(a.tolerance >= 0)) err(`${where}: tolerance ≥ 0`);
      } else err(`${where}: answer muss „choice“ oder „number“ sein`);
      break;
    }
    case "summary":
      if (!isText(st.lesson)) err(`${where}: lesson fehlt`);
      validateBlocks(st.blocks, where, err);
      if (
        st.recall !== undefined &&
        !earlier.some((e) => e.id === st.recall && e.kind === "predict")
      )
        err(`${where}: recall muss auf einen früheren Vorhersage-Schritt zeigen`);
      break;
    default:
      err(`${where}: unbekannte Art „${(st as { kind?: string }).kind}“`);
  }
}

export function validateLevel(level: unknown): ValidationResult {
  const errors: string[] = [];
  const err = (m: string) => errors.push(m);
  const l = level as Partial<LevelDef> | null;
  if (!l || typeof l !== "object") return { ok: false, errors: ["Level ist kein Objekt"] };

  if (typeof l.id !== "string" || !SLUG.test(l.id))
    err("id muss ein Slug sein (a–z, 0–9, Bindestrich)");
  if (!isText(l.name)) err("name fehlt oder ist kein Text");
  if (l.concepts !== undefined && !isTextList(l.concepts))
    err("concepts muss eine Liste von Texten sein");

  if (!Array.isArray(l.steps) || !l.steps.length) {
    err("steps muss mindestens einen Schritt enthalten");
    return { ok: false, errors };
  }
  const seen = new Set<string>();
  l.steps.forEach((st, i) => {
    if (!st || typeof st !== "object") return err(`Schritt ${i + 1} ist kein Objekt`);
    if (typeof st.id !== "string" || !SLUG.test(st.id))
      err(`Schritt ${i + 1}: id muss ein Slug sein`);
    else if (seen.has(st.id)) err(`Schritt-ID „${st.id}“ doppelt`);
    seen.add(st.id);
    validateStep(st, l.steps.slice(0, i), err);
  });

  return { ok: errors.length === 0, errors };
}
