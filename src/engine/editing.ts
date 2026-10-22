/* Bearbeitungsbefehle an der Schaltung als reine Funktionen: Schaltung rein, neue
   Schaltung raus. Jeder Befehl prüft seine Regeln selbst und gibt bei Ablehnung das
   unveränderte Objekt zurück – Referenzgleichheit heißt „nichts passiert“. Die
   Oberfläche übersetzt nur Gesten in Befehle; so lassen sie sich ohne React prüfen
   und von der KI-Schnittstelle genauso benutzen. */
import type {
  BoardSpec,
  Circuit,
  Orient,
  Part,
  PartId,
  PartType,
  PointKey,
  Side,
  ToolId,
  WireKey,
} from "../domain/types";
import {
  OPPOSITE,
  nextPartId,
  parsePoint,
  partAt,
  pointKey,
  sideTowards,
  wireKey,
  wiresAt,
} from "./circuit";
import { P, ROTATABLE, portsOf } from "./parts";

export type PlayMode = "level" | "sandbox";

/** Wo und wie bearbeitet wird: Brett (Grenzen, Wände) und Modus (Schutz der Vorgaben). */
export interface EditContext {
  board: BoardSpec;
  mode: PlayMode;
}

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
   siehe den Werkzeugwechsel in useBoardEditor. */
export const METER = new Set<ToolId>(["ammeter", "voltmeter"]);

/* ---------- Brett ---------- */

const wallCache = new WeakMap<readonly PointKey[], Set<PointKey>>();
function isWall(board: BoardSpec, p: PointKey): boolean {
  if (!board.walls?.length) return false;
  let s = wallCache.get(board.walls);
  if (!s) wallCache.set(board.walls, (s = new Set(board.walls)));
  return s.has(p);
}

/** Punkt liegt auf dem Brett und ist nicht gesperrt. */
export function isFree(board: BoardSpec, p: PointKey): boolean {
  const [x, y] = parsePoint(p);
  return x >= 0 && y >= 0 && x < board.W && y < board.H && !isWall(board, p);
}

/* ---------- Schutz der Vorgaben ---------- */

/* Im Level gehört nur das dem Spieler, was er selbst gesetzt hat, und Leitungen, die
   das Level nicht fest verlegt hat. Beim Frei bauen gehört ihm alles. */
export const ownsPart = (ctx: EditContext, part: Part) => ctx.mode === "sandbox" || !!part.user;
export const ownsWire = (ctx: EditContext, c: Circuit, k: WireKey) =>
  ctx.mode === "sandbox" || !c.wires[k]?.lock;

/* ---------- Leitungen ---------- */

/* Ein Leitungsende passt an einen Punkt, wenn dort kein Bauteil sitzt (Leitungsknoten)
   oder das Bauteil auf dieser Seite einen Anschluss hat. */
function accepts(c: Circuit, p: PointKey, side: Side): boolean {
  const id = partAt(c, p);
  return !id || portsOf(c.parts[id]).includes(side);
}

/** Ob zwischen a und b eine neue Leitung gezogen werden darf. */
export function canConnect(c: Circuit, ctx: EditContext, a: PointKey, b: PointKey): boolean {
  const s = sideTowards(a, b);
  if (!s || !isFree(ctx.board, a) || !isFree(ctx.board, b)) return false;
  if (c.wires[wireKey(a, b)]) return false;
  return accepts(c, a, s) && accepts(c, b, OPPOSITE[s]);
}

export function connect(c: Circuit, ctx: EditContext, a: PointKey, b: PointKey): Circuit {
  if (!canConnect(c, ctx, a, b)) return c;
  return { ...c, wires: { ...c.wires, [wireKey(a, b)]: {} } };
}

export function disconnect(c: Circuit, ctx: EditContext, k: WireKey): Circuit {
  if (!c.wires[k] || !ownsWire(ctx, c, k)) return c;
  const wires = { ...c.wires };
  delete wires[k];
  return { ...c, wires };
}

/* ---------- Bauteile ---------- */

/** Neues Bauteil, wie ein Werkzeug es setzt. Auch Vorschau der Werkzeugkacheln:
    „opener“ ist kein eigener Typ, sondern ein Schalter mit nc – ohne diese
    Übersetzung bliebe die Kachel leer. */
export function newPart(tool: ToolId, x: number, y: number, orient: Orient): Part {
  if (!PLACEABLE.has(tool)) throw new Error(`Werkzeug „${tool}“ setzt kein Bauteil`);
  const part: Part = { type: tool as PartType, x, y, user: true };
  if (tool !== "cross") part.orient = orient;
  if (tool === "switch" || tool === "button") part.closed = false;
  /* Der Öffner ist elektrisch ein gewöhnlicher Schalter – er startet nur
     geschlossen und trägt das andere Symbol. */
  if (tool === "opener") Object.assign(part, { type: "switch", nc: true, closed: true });
  if (tool === "spdt") Object.assign(part, { dir: orient === "h" ? "W" : "N", pos: 0 });
  return part;
}

/* Ein Bauteil passt auf einen Punkt, wenn jede dort endende Leitung auf einen seiner
   Anschlüsse trifft. So lässt es sich in eine bestehende Leitung einsetzen, ohne sie
   erst zu löschen – die Ausrichtung wird dabei nicht erraten, sondern muss stimmen. */
function fits(c: Circuit, p: PointKey, part: Part): boolean {
  const ports = portsOf(part);
  return wiresAt(c, p).every((w) => ports.includes(w.side));
}

export function canPlace(
  c: Circuit,
  ctx: EditContext,
  p: PointKey,
  tool: ToolId,
  orient: Orient,
): boolean {
  if (!PLACEABLE.has(tool) || !isFree(ctx.board, p) || partAt(c, p)) return false;
  const [x, y] = parsePoint(p);
  return fits(c, p, newPart(tool, x, y, orient));
}

export function place(
  c: Circuit,
  ctx: EditContext,
  p: PointKey,
  tool: ToolId,
  orient: Orient,
): { circuit: Circuit; id?: PartId } {
  if (!canPlace(c, ctx, p, tool, orient)) return { circuit: c };
  const [x, y] = parsePoint(p);
  const part = newPart(tool, x, y, orient);
  const id = nextPartId(c, part.type);
  return { circuit: { ...c, parts: { ...c.parts, [id]: part } }, id };
}

/* Mit dem Bauteil gehen die Leitungen, die an ihm enden. Blieben sie liegen, träfen
   sie sich am leeren Punkt und verbänden, was das Bauteil getrennt hat – aus einer
   entfernten Lampe würde eine Brücke. Fest verlegte Leitungen bleiben: sie lagen schon
   vor dem Einsetzen dort, ohne das Bauteil ist der Ausgangszustand wieder hergestellt. */
export function removePart(c: Circuit, ctx: EditContext, id: PartId): Circuit {
  const part = c.parts[id];
  if (!part || !ownsPart(ctx, part)) return c;
  const parts = { ...c.parts };
  delete parts[id];
  const wires = { ...c.wires };
  for (const w of wiresAt(c, pointKey(part.x, part.y)))
    if (ownsWire(ctx, c, w.key)) delete wires[w.key];
  return { parts, wires };
}

/** Löschen an einem Punkt: das Bauteil dort, sonst alle eigenen Leitungen des Knotens. */
export function erasePoint(c: Circuit, ctx: EditContext, p: PointKey): Circuit {
  const id = partAt(c, p);
  if (id) return removePart(c, ctx, id);
  const own = wiresAt(c, p).filter((w) => ownsWire(ctx, c, w.key));
  if (!own.length) return c;
  const wires = { ...c.wires };
  for (const w of own) delete wires[w.key];
  return { ...c, wires };
}

/* ---------- Antippen ---------- */

export interface Activation {
  circuit: Circuit;
  /** "operate" = Bedienung (Schalter, Taster, Sicherung), "edit" = Änderung am Aufbau
      (drehen, Wert, Polung). Nur Änderungen am Aufbau kommen in den Verlauf. */
  kind: "operate" | "edit" | "none";
  /** Gesetzt, wenn ein Taster gedrückt wurde und beim Loslassen zurückfedern muss. */
  pressed?: PartId;
}

const withPart = (c: Circuit, id: PartId, patch: Partial<Part>): Circuit => ({
  ...c,
  parts: { ...c.parts, [id]: { ...c.parts[id], ...patch } },
});

/* Drehen ändert die Anschlussseiten. Leitungen, die danach ins Leere liefen, werden
   gelöst; gehört eine davon dem Level, bleibt das Bauteil liegen, wie es ist. */
function rotate(c: Circuit, ctx: EditContext, id: PartId): Circuit {
  const part = c.parts[id];
  const turned: Part = { ...part, orient: part.orient === "h" ? "v" : "h" };
  const ports = portsOf(turned);
  const loose = wiresAt(c, pointKey(part.x, part.y)).filter((w) => !ports.includes(w.side));
  if (loose.some((w) => !ownsWire(ctx, c, w.key))) return c;
  const wires = { ...c.wires };
  for (const w of loose) delete wires[w.key];
  return { parts: { ...c.parts, [id]: turned }, wires };
}

/* Antippen eines Bauteils: Schalten, Drehen, Wert weiterschalten – je nach Typ. */
export function activate(c: Circuit, ctx: EditContext, id: PartId): Activation {
  const part = c.parts[id];
  if (!part) return { circuit: c, kind: "none" };
  if (part.type === "switch")
    return { circuit: withPart(c, id, { closed: !part.closed }), kind: "operate" };
  /* Betätigt: ein Schließer leitet, ein Öffner trennt. closed heißt „leitet“. */
  if (part.type === "button")
    return { circuit: withPart(c, id, { closed: !part.nc }), kind: "operate", pressed: id };
  /* Gekoppelte Wechselschalter (Kreuzschalter): alle mit derselben link-ID springen mit. */
  if (part.type === "spdt") {
    const pos = part.pos ? 0 : 1;
    const parts = { ...c.parts };
    for (const [k, p] of Object.entries(c.parts))
      if (k === id || (part.link && p.link === part.link)) parts[k] = { ...p, pos };
    return { circuit: { ...c, parts }, kind: "operate" };
  }
  /* ausgelöste Sicherung wieder einschalten – hält die Ursache noch an,
     löst sie sofort wieder aus */
  if (part.type === "fuse")
    return part.open
      ? { circuit: withPart(c, id, { open: false }), kind: "operate" }
      : { circuit: c, kind: "none" };
  /* Drehen per Tippen: beim Frei bauen immer, im Level nur bei selbst gesetzten
     Bauteilen. Was das Level vorgibt, bleibt liegen – dort ist die Lage Teil
     der Aufgabe (etwa das fest verbaute Amperemeter in „Der Vorwiderstand“). */
  if (ROTATABLE.has(part.type)) {
    if (!ownsPart(ctx, part)) return { circuit: c, kind: "none" };
    const n = rotate(c, ctx, id);
    return { circuit: n, kind: n === c ? "none" : "edit" };
  }
  const vals = P(part, "values");
  if (vals) {
    /* liegt der aktuelle Wert nicht in der Reihe, weiter zum nächstgrößeren */
    const r = P(part, "r"),
      i = vals.indexOf(r);
    const next = i >= 0 ? vals[(i + 1) % vals.length] : (vals.find((v) => v > r) ?? vals[0]);
    return next === r
      ? { circuit: c, kind: "none" }
      : { circuit: withPart(c, id, { r: next }), kind: "edit" };
  }
  /* LEDs sind immer drehbar, Quellen nur wo das Level es vorsieht */
  if (part.type === "led" || part.flip)
    return { circuit: withPart(c, id, { rev: !part.rev }), kind: "edit" };
  return { circuit: c, kind: "none" };
}

/* Taster loslassen: federt in die Ruhelage zurück. */
export function release(c: Circuit, id: PartId): Circuit {
  const part = c.parts[id];
  return part ? withPart(c, id, { closed: !!part.nc }) : c;
}

/* Ausgelöste Sicherungen bleiben offen, bis sie angetippt werden. */
export function latchTripped(c: Circuit, tripped: Iterable<PartId>): Circuit {
  const blown = [...tripped].filter((id) => c.parts[id] && !c.parts[id].open);
  if (!blown.length) return c;
  const parts = { ...c.parts };
  for (const id of blown) parts[id] = { ...parts[id], open: true };
  return { ...c, parts };
}

/* Bedienzustand: was Schalter, Taster und Sicherungen gerade tun. Er gehört nicht zum
   Aufbau – wer eine Leitung zurücknimmt, will dabei keinen Schalter umlegen. */
const OPERATING: readonly (keyof Part)[] = ["closed", "pos", "open"];

/** Übernimmt den Bedienzustand aus `from` für alle Bauteile, die es in beiden gibt. */
export function carryOperatingState(target: Circuit, from: Circuit): Circuit {
  let parts: Circuit["parts"] | null = null;
  for (const [id, t] of Object.entries(target.parts)) {
    const f = from.parts[id];
    if (!f || f.type !== t.type) continue;
    if (OPERATING.every((k) => t[k] === f[k])) continue;
    parts ??= { ...target.parts };
    const next: Record<string, unknown> = { ...t };
    for (const k of OPERATING) {
      if (f[k] === undefined) delete next[k];
      else next[k] = f[k];
    }
    parts[id] = next as unknown as Part; // nur Bedienfelder ersetzt, Typ und Ort unverändert
  }
  return parts ? { ...target, parts } : target;
}
