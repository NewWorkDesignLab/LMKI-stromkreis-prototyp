import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import type {
  BuildStep,
  Circuit,
  Orient,
  PartId,
  PointKey,
  ToolId,
  WireKey,
} from "../../domain/types";
import { cloneCircuit, parsePoint, partAt, pointKey, wireKey } from "../../engine/circuit";
import {
  METER,
  PLACEABLE,
  activate,
  canPlace,
  carryOperatingState,
  connect,
  disconnect,
  erasePoint,
  isFree,
  newPart,
  place,
  release as releasePart,
  remaining,
  removePart,
  snapToTerminals,
  type EditContext,
  type PlayMode,
} from "../../engine/editing";
import { CELL, PAD_X, boardExtent } from "../../render/geometry";
import type { BoardHint, BoardPointerHandlers } from "../../render/Board";
import { useUndoable } from "./useUndoable";

/* Lage des Zeigers in Punktkoordinaten, mit Bruchteil: (0,0) ist der erste Punkt,
   0,5 liegt genau zwischen zwei Punkten. */
interface Pos {
  fx: number;
  fy: number;
}

type EraseTarget = { kind: "point"; at: PointKey } | { kind: "wire"; key: WireKey };

/* Worauf der Zeiger zielt: der nächste Punkt und, fürs Löschen, Punkt oder Leitung. Nur das
   wird gespeichert – der Hinweis daraus wird bei jedem Zeichnen neu abgeleitet, damit er
   Drehen (R), Werkzeugwechsel und Änderungen am Brett sofort zeigt, ohne dass sich die Maus
   bewegen muss. */
interface Aim {
  at: PointKey;
  erase: EraseTarget;
}

/* Wie nah am Punkt der Zeiger sein muss, damit der Punkt gemeint ist und nicht die
   Leitung daneben – in Punktabständen. Deutlich unter 0,5, damit zwischen zwei Punkten
   sicher die Leitung getroffen wird. */
const POINT_RADIUS = 0.3;

const nearest = ({ fx, fy }: Pos): PointKey => pointKey(Math.round(fx), Math.round(fy));

/* Treppenweg von a nach b in Nachbarschritten. Schnelle Züge überspringen Zeigerereignisse;
   so entstehen trotzdem lückenlose Leitungen, bei schrägen Sprüngen als Treppe. */
function steps(a: PointKey, b: PointKey): [PointKey, PointKey][] {
  let [x, y] = parsePoint(a);
  const [bx, by] = parsePoint(b);
  const out: [PointKey, PointKey][] = [];
  while (x !== bx || y !== by) {
    const from = pointKey(x, y);
    if (Math.abs(bx - x) >= Math.abs(by - y)) x += Math.sign(bx - x);
    else y += Math.sign(by - y);
    out.push([from, pointKey(x, y)]);
  }
  return out;
}

interface Gesture {
  kind: "draw" | "erase";
  /** zuletzt erreichter Punkt */
  last: PointKey;
  /** Bauteil unter dem Zeiger, solange offen ist, ob es ein Tippen oder ein Zug wird */
  tap: PartId | null;
}

/* Eingabe aufs Brett: Zeigerbewegungen werden zu Bearbeitungsbefehlen. Die Befehle
   selbst sind reine Funktionen in engine/editing.ts; hier steckt nur die Geste –
   was ein Tippen, was ein Zug und was ein Loslassen bedeutet – und der Verlauf. */
export function useBoardEditor(
  level: Pick<BuildStep, "W" | "H" | "walls" | "circuit" | "palette" | "stock">,
  mode: PlayMode,
  /** Tastenkürzel nur, solange das Brett sichtbar ist */
  active = true,
  /** Ziehhilfe (Einstellung): erreichte Punkte schließen sich an Anschlüsse an */
  snapWires = false,
) {
  const { W, H, walls } = level;
  const canErase = level.palette.includes("erase");
  const { stock } = level;
  const ctx: EditContext = useMemo(
    () => ({ board: { W, H, walls }, mode, stock }),
    [W, H, walls, mode, stock],
  );
  const doc = useUndoable<Circuit>(() => cloneCircuit(level.circuit), carryOperatingState);
  const { present: circuit, apply, update, commit, begin, end, undo, redo } = doc;

  const [tool, setTool] = useState<ToolId>("wire");
  const [orient, setOrient] = useState<Orient>("h");
  const [isDrawing, setIsDrawing] = useState(false);
  const [aim, setAim] = useState<Aim | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const pressed = useRef<PartId | null>(null);

  const { w: vbW, h: vbH } = boardExtent(W, H);

  /* Die viewBox ist um den Beschriftungsrand größer als das Spielfeld und fängt
     links bei −PAD_X an – beides muss hier mitgerechnet werden, sonst liegt der
     getroffene Punkt daneben. */
  const eventPos = (e: PointerEvent): Pos | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    const vx = ((e.clientX - r.left) / r.width) * vbW - PAD_X;
    const vy = ((e.clientY - r.top) / r.height) * vbH;
    const fx = vx / CELL - 0.5,
      fy = vy / CELL - 0.5;
    if (fx < -0.5 || fy < -0.5 || fx > W - 0.5 || fy > H - 0.5) return null;
    return { fx, fy };
  };

  const eraseTarget = (pos: Pos): EraseTarget => {
    const px = Math.round(pos.fx),
      py = Math.round(pos.fy);
    const dx = pos.fx - px,
      dy = pos.fy - py;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < POINT_RADIUS)
      return { kind: "point", at: pointKey(px, py) };
    const other =
      Math.abs(dx) >= Math.abs(dy)
        ? pointKey(px + (dx < 0 ? -1 : 1), py)
        : pointKey(px, py + (dy < 0 ? -1 : 1));
    return { kind: "wire", key: wireKey(pointKey(px, py), other) };
  };

  /* ---- Bedienung und Änderungen ---- */
  const interact = useCallback(
    (id: PartId) =>
      apply((c) => {
        const r = activate(c, ctx, id);
        if (r.pressed) pressed.current = r.pressed;
        return { value: r.circuit, record: r.kind === "edit" };
      }),
    [apply, ctx],
  );
  const release = useCallback(() => {
    const id = pressed.current;
    if (!id) return;
    pressed.current = null;
    update((c) => releasePart(c, id));
  }, [update]);

  const eraseTap = (pos: Pos) => {
    const t = eraseTarget(pos);
    update((c) => (t.kind === "point" ? erasePoint(c, ctx, t.at) : disconnect(c, ctx, t.key)));
  };
  /* Beim Ziehen werden nur die überstrichenen Leitungen gelöscht und Bauteile, deren
     Mitte getroffen wird – ein Knotenpunkt auf dem Weg verliert nicht gleich alle seine
     Abzweige, wie es ein gezieltes Tippen auf ihn täte. */
  const eraseDrag = (g: Gesture, pos: Pos) => {
    const p = nearest(pos);
    const path = steps(g.last, p);
    const t = eraseTarget(pos);
    update((c) => {
      let n = c;
      for (const [a, b] of path) n = disconnect(n, ctx, wireKey(a, b));
      const id = t.kind === "point" ? partAt(n, t.at) : undefined;
      return id ? removePart(n, ctx, id) : n;
    });
    g.last = p;
  };
  /* Mit Ziehhilfe wird jeder erreichte Punkt sofort an die Anschlüsse daneben gelegt,
     auch der Startpunkt – aber erst, wenn aus dem Tippen ein Zug wird. */
  const drawTo = (g: Gesture, p: PointKey) => {
    const path = steps(g.last, p);
    if (!path.length) return;
    update((c) =>
      path.reduce((n, [a, b]) => {
        const linked = connect(n, ctx, a, b);
        return snapWires ? snapToTerminals(snapToTerminals(linked, ctx, a), ctx, b) : linked;
      }, c),
    );
    g.last = p;
  };

  /* ---- Hinweis unter dem Zeiger ---- */
  const hintFor = ({ at: p, erase: t }: Aim, erasing: boolean): BoardHint | null => {
    if (erasing) {
      if (t.kind === "wire") return circuit.wires[t.key] ? { kind: "eraseWire", key: t.key } : null;
      return erasePoint(circuit, ctx, t.at) !== circuit ? { kind: "erasePoint", at: t.at } : null;
    }
    if (!isFree(ctx.board, p)) return null;
    if (PLACEABLE.has(tool) && !partAt(circuit, p)) {
      const [x, y] = parsePoint(p);
      return {
        kind: "ghost",
        part: newPart(tool, x, y, orient),
        ok: canPlace(circuit, ctx, p, tool, orient),
      };
    }
    return tool === "wire" || gesture.current?.kind === "draw" ? { kind: "point", at: p } : null;
  };
  /* neu zeichnen nur, wenn sich das Ziel ändert, nicht bei jedem Zeigerereignis */
  const aimAt = (pos: Pos | null) => {
    const a = pos && { at: nearest(pos), erase: eraseTarget(pos) };
    setAim((old) => (JSON.stringify(old) === JSON.stringify(a) ? old : a));
  };
  const g = gesture.current;
  const hint = aim && hintFor(aim, g ? g.kind === "erase" : tool === "erase");

  /* ---- Gesten ---- */
  const onDown = (e: PointerEvent<SVGSVGElement>) => {
    if (!e.isPrimary || (e.button !== 0 && e.button !== 2)) return;
    e.preventDefault();
    const pos = eventPos(e);
    if (!pos) return;
    const p = nearest(pos);
    /* Rechtsklick löscht mit jedem Werkzeug – schneller als der Werkzeugwechsel. */
    if (tool === "erase" || e.button === 2) {
      begin();
      gesture.current = { kind: "erase", last: p, tap: null };
      setIsDrawing(true);
      eraseTap(pos);
      return;
    }
    /* Ein Bauteil reagiert immer, egal welches Werkzeug aktiv ist – sonst müsste man
       zum Umschalten jedes Mal das Werkzeug wechseln. Ein Zug davon weg beginnt eine
       Leitung an seinem Anschluss; was gemeint war, entscheidet sich beim Loslassen.
       Der Taster ist die Ausnahme: er leitet nur, solange er gedrückt ist. */
    const id = partAt(circuit, p);
    if (id) {
      if (circuit.parts[id].type === "button") return interact(id);
      begin();
      gesture.current = { kind: "draw", last: p, tap: id };
      setIsDrawing(true);
      return;
    }
    if (PLACEABLE.has(tool)) {
      if (!canPlace(circuit, ctx, p, tool, orient)) return;
      /* Im Level wird ein Messgerät genau einmal eingesetzt und danach verdrahtet;
         das Werkzeug springt deshalb gleich auf Verdrahten zurück. Beim Frei bauen
         bleibt es stehen: dort setzt man mehrere gleiche Bauteile. */
      if (mode === "level" && METER.has(tool)) setTool("wire");
      commit((c) => place(c, ctx, p, tool, orient).circuit);
      return;
    }
    if (!isFree(ctx.board, p)) return;
    begin();
    gesture.current = { kind: "draw", last: p, tap: null };
    setIsDrawing(true);
  };

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const pos = eventPos(e);
    const g = gesture.current;
    aimAt(pos);
    if (!pos || !g) return;
    const p = nearest(pos);
    if (g.kind === "erase") return eraseDrag(g, pos);
    /* verlässt der Zeiger den Startpunkt, ist es ein Zug und kein Tippen */
    if (p !== g.last) g.tap = null;
    drawTo(g, p);
  };

  /* Loslassen über dem Feld schaltet das Bauteil, auf dem der Zug begann. Beim
     Verlassen des Feldes gilt die Geste als abgebrochen – ein Bauteil am Rand soll
     nicht schalten, nur weil man darüber hinausgezogen hat. */
  const stop = useCallback(
    (keep: boolean) => {
      const g = gesture.current;
      gesture.current = null;
      setIsDrawing(false);
      end();
      if (keep && g?.tap) interact(g.tap);
      release();
    },
    [end, interact, release],
  );

  const handlers: BoardPointerHandlers = {
    onPointerDown: onDown,
    onPointerMove: onMove,
    onPointerUp: () => stop(true),
    onPointerLeave: () => {
      aimAt(null);
      stop(false);
    },
    onPointerCancel: () => stop(false),
    onContextMenu: (e) => e.preventDefault(),
  };

  /* Strg+Z / Strg+Y / Strg+Umschalt+Z, dazu W bzw. Esc (Verdrahten), E (Löschen, wenn das
     Level es erlaubt) und R (Ausrichtung drehen). Bauteile bekommen bewusst keine
     Kürzel: es gibt mehr Bauteilarten als Zifferntasten, und je Level stünden sie anders.
     Nicht in Eingabefeldern – dort gehören die Tasten dem Text. Eine laufende Geste wird
     vorher abgeschlossen. */
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      const k = e.key.toLowerCase();
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (k === "r") return setOrient((o) => (o === "h" ? "v" : "h"));
        const next = k === "w" || k === "escape" ? "wire" : k === "e" && canErase ? "erase" : null;
        if (!next) return;
        /* ein Werkzeugwechsel mitten im Zug schließt den Zug ab, statt ihn umzudeuten */
        stop(false);
        setTool(next);
        return;
      }
      if (e.altKey) return;
      const action = k === "z" ? (e.shiftKey ? redo : undo) : k === "y" ? redo : null;
      if (!action) return;
      e.preventDefault();
      stop(false);
      action();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, undo, redo, stop, canErase]);

  return {
    circuit,
    /** wie viele Teile eines Werkzeugs noch gesetzt werden dürfen; null = unbegrenzt */
    left: (t: ToolId) => remaining(circuit, ctx, t),
    /** Änderung ohne Verlaufseintrag */
    update,
    /** Änderung am Aufbau, mit Verlaufseintrag */
    commit,
    undo: () => {
      stop(false);
      undo();
    },
    redo: () => {
      stop(false);
      redo();
    },
    canUndo: doc.canUndo,
    canRedo: doc.canRedo,
    tool,
    setTool,
    orient,
    setOrient,
    isDrawing,
    hint,
    svgRef,
    handlers,
    /** Taster von außen betätigen (Funktionsansicht) */
    press: interact,
    release,
    /** laufende Geste abbrechen */
    cancelGesture: () => stop(false),
  };
}
