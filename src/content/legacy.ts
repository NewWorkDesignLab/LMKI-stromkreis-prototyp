/* ÜBERGANGSFORMAT der Prototyp-Level. Neue Level nicht in diesem Format schreiben.

   Im Prototyp war das Feld ein Zellraster `{"x,y": zelle}`, in dem Leitungen eigene
   Zellen waren und sich JEDE Zelle mit jeder benachbarten Zelle verband, sobald beide
   zur gemeinsamen Seite einen Anschluss hatten. Ziele und Widgets verwiesen auf Zellen.
   Die Level dieses Formats werden beim Laden in das heutige Modell übersetzt
   (Bauteile mit IDs, Leitungen als Kanten). Die Übersetzung übernimmt die alte
   Nachbarschaftsregel genau einmal, beim Laden – danach gilt auch für diese Level:
   verbunden ist nur, was als Kante existiert.

   Ein Level dieses Formats war genau eine Bauaufgabe mit Merksatz. Die Übersetzung macht
   daraus die Schritte „Bauen“ und „Merksatz“; `before` stellt Schritte im heutigen
   Format davor (Realitätsbezug, Rechnen vor dem Bauen). */
import type {
  Block,
  BuildStep,
  Circuit,
  ConceptId,
  ContactLabContact,
  Goal,
  LevelDef,
  LevelId,
  Part,
  PartId,
  PartType,
  PointKey,
  Side,
  Step,
} from "../domain/types";
import { ID_PREFIX, OPPOSITE, neighbor, parsePoint, wireKey } from "../engine/circuit";
import { hasPort } from "../engine/parts";

type LegacyCellType = PartType | "wire" | "wall";

export interface LegacyCell extends Omit<Part, "type" | "x" | "y"> {
  type: LegacyCellType;
  /** Fest verlegte Leitung: nicht löschbar, nicht ersetzbar */
  lock?: boolean;
}
export type LegacyGrid = Record<PointKey, LegacyCell>;

/** Ein Level im Altformat: ein Bauschritt mit Zellen statt Schaltung, Verweise über
    Zellschlüssel, dazu der Merksatz. */
export interface LegacyLevelDef extends Omit<
  BuildStep,
  "kind" | "id" | "circuit" | "walls" | "solution"
> {
  id: LevelId;
  name: string;
  concepts?: ConceptId[];
  lesson: string;
  /** Erklärung im Merksatz-Schritt: wie das Gebaute und der Merksatz zusammenhängen */
  explanation?: Block[];
  cells: LegacyGrid;
  /** Schritte im heutigen Format vor dem Bauen */
  before?: Step[];
}

const legacyPort = (c: LegacyCell, side: Side) =>
  c.type === "wire" || (c.type !== "wall" && hasPort(c as LegacyCell & { type: PartType }, side));

/** Übersetzt ein Zellraster. `ids` ordnet jeder Bauteilzelle ihre neue ID zu. */
export function circuitFromCells(cells: LegacyGrid): {
  circuit: Circuit;
  walls: PointKey[];
  ids: Map<PointKey, PartId>;
} {
  const circuit: Circuit = { parts: {}, wires: {} };
  const walls: PointKey[] = [];
  const ids = new Map<PointKey, PartId>();
  /* IDs in Lesereihenfolge (Zeile für Zeile, links nach rechts), je Kennbuchstabe
     hochgezählt – so wie man einen Schaltplan beschriftet. Einführungen verlassen
     sich darauf (content/tutorials.ts). */
  const keys = Object.keys(cells).sort((a, b) => {
    const [ax, ay] = parsePoint(a),
      [bx, by] = parsePoint(b);
    return ay - by || ax - bx;
  });
  const count: Record<string, number> = {};
  for (const k of keys) {
    const c = cells[k];
    if (c.type === "wall") walls.push(k);
    if (c.type === "wall" || c.type === "wire") continue;
    const { lock: _lock, ...props } = c;
    const [x, y] = parsePoint(k);
    const prefix = ID_PREFIX[c.type];
    const id = `${prefix}${(count[prefix] = (count[prefix] ?? 0) + 1)}`;
    circuit.parts[id] = { ...props, type: c.type, x, y };
    ids.set(k, id);
  }
  /* Früher verband die Nachbarschaft; jetzt wird daraus eine Kante. Fest ist sie, wenn
     keines ihrer Enden eine löschbare Leitungszelle war – sonst hätte man sie im Level
     durch Löschen dieser Zelle entfernen können. */
  const removable = (c: LegacyCell) => (c.type === "wire" ? !c.lock : !!c.user);
  for (const k of keys)
    for (const side of ["E", "S"] as const) {
      const n = neighbor(k, side),
        a = cells[k],
        b = cells[n];
      if (!b || !legacyPort(a, side) || !legacyPort(b, OPPOSITE[side])) continue;
      circuit.wires[wireKey(k, n)] = removable(a) || removable(b) ? {} : { lock: true };
    }
  return { circuit, walls, ids };
}

/** Übersetzt ein ganzes Level. Ein Verweis auf eine Zelle ohne Bauteil ist ein
    Inhaltsfehler und wirft – das fällt in content.test.ts auf, nicht erst im Spiel. */
export function fromLegacyLevel(l: LegacyLevelDef): LevelDef {
  const {
    id: levelId,
    name,
    concepts,
    lesson,
    explanation,
    before,
    cells,
    contactLab,
    goals,
    latch,
    ...board
  } = l;
  const { circuit, walls, ids } = circuitFromCells(cells);
  const id = (k: PointKey): PartId => {
    const v = ids.get(k);
    if (!v) throw new Error(`Level „${levelId}“: an ${k} liegt kein Bauteil`);
    return v;
  };
  /* „!“ vor einem Eingang bleibt erhalten: „!1,0“ wird zu „!S1“ */
  const input = (k: string) => (k[0] === "!" ? `!${id(k.slice(1))}` : id(k));
  const goal = (g: Goal): Goal => {
    switch (g.k) {
      case "on":
      case "wired":
        return { ...g, ...(g.at && { at: id(g.at) }), ...(g.ats && { ats: g.ats.map(id) }) };
      case "read":
        return g.at ? { ...g, at: id(g.at) } : g;
      case "measure":
        return { ...g, of: id(g.of) };
      case "logic":
        return { ...g, at: id(g.at), inputs: g.inputs.map(input) };
      case "toggle":
        return { ...g, at: id(g.at), inputs: g.inputs.map(id) };
      case "tried":
        return { ...g, ats: g.ats.map(id) };
      case "state":
        return {
          ...g,
          pressed: Object.fromEntries(Object.entries(g.pressed).map(([k, v]) => [id(k), v])),
        };
      default:
        return g;
    }
  };
  const contact = (c: ContactLabContact) => ({ contact: id(c.contact), lamp: id(c.lamp) });
  const build: BuildStep = {
    ...board,
    kind: "build",
    id: "bauen",
    circuit,
    ...(walls.length > 0 && { walls }),
    ...(goals && { goals: goals.map(goal) }),
    ...(latch && { latch: { lit: latch.lit.map(id) } }),
    ...(contactLab && {
      contactLab: { closer: contact(contactLab.closer), opener: contact(contactLab.opener) },
    }),
  };
  return {
    id: levelId,
    name,
    ...(concepts && { concepts }),
    steps: [
      ...(before ?? []),
      build,
      { kind: "summary", id: "merksatz", lesson, ...(explanation && { blocks: explanation }) },
    ],
  };
}
