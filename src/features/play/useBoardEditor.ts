import { useRef, useState, type PointerEvent } from "react";
import type { CellKey, Grid, LevelDef, Orient, ToolId } from "../../domain/types";
import {
  METER,
  PLACEABLE,
  activateAt,
  canPlace,
  cloneGrid,
  eraseAt,
  placeAt,
  releaseAt,
  wireAt,
  type PlayMode,
} from "../../engine/editing";
import { CELL, PAD_B, PAD_X } from "../../render/geometry";
import type { BoardPointerHandlers } from "../../render/Board";

/* Eingabe aufs Brett: Zeigerbewegungen werden zu Änderungen am Feld. Die Änderungen
   selbst sind reine Funktionen in engine/editing.ts; hier steckt nur die Geste –
   was ein Tippen, was ein Zug und was ein Loslassen bedeutet. */
export function useBoardEditor(level: Pick<LevelDef, "W" | "H" | "cells">, mode: PlayMode) {
  const { W, H } = level;
  const [grid, setGrid] = useState<Grid>(() => cloneGrid(level.cells));
  const [tool, setTool] = useState<ToolId>("wire");
  const [orient, setOrient] = useState<Orient>("h");
  const [isDrawing, setIsDrawing] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const drawing = useRef(false);
  const lastCell = useRef<[number, number] | null>(null);
  const pressed = useRef<CellKey | null>(null);
  /* Bauteil unter dem Zeiger, solange offen ist, ob es ein Tippen oder ein Zug wird */
  const tap = useRef<[number, number] | null>(null);

  const vbW = W * CELL + PAD_X * 2,
    vbH = H * CELL + PAD_B;

  /* ---- Änderungen am Feld ---- */
  const setWire = (x: number, y: number) => setGrid((p) => wireAt(p, x, y));
  const eraseCell = (x: number, y: number) => setGrid((p) => eraseAt(p, x, y, mode));
  const placeComp = (x: number, y: number, type: ToolId) =>
    setGrid((p) => placeAt(p, x, y, type, orient));
  const interact = (x: number, y: number) =>
    setGrid((p) => {
      const r = activateAt(p, x, y, mode);
      if (r.pressedKey) pressed.current = r.pressedKey;
      return r.grid;
    });
  const release = () => {
    const k = pressed.current;
    if (!k) return;
    pressed.current = null;
    setGrid((p) => releaseAt(p, k));
  };

  /* Die viewBox ist um den Beschriftungsrand größer als das Spielfeld und fängt
     links bei −PAD_X an – beides muss hier mitgerechnet werden, sonst liegt der
     getroffene Zellindex daneben. */
  const eventCell = (e: PointerEvent): [number, number] | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    const x = Math.floor((((e.clientX - r.left) / r.width) * vbW - PAD_X) / CELL);
    const y = Math.floor((((e.clientY - r.top) / r.height) * vbH) / CELL);
    if (x < 0 || y < 0 || x >= W || y >= H) return null;
    return [x, y];
  };

  const onDown = (e: PointerEvent<SVGSVGElement>) => {
    if (!e.isPrimary || e.button !== 0) return;
    e.preventDefault();
    const c = eventCell(e);
    if (!c) return;
    setIsDrawing(true);
    lastCell.current = c;
    if (tool === "erase") {
      drawing.current = true;
      return eraseCell(c[0], c[1]);
    }
    /* Ein Bauteil reagiert immer, egal welches Werkzeug aktiv ist – sonst
       müsste man zum Umstellen jedes Mal das Werkzeug wechseln. Setzen und
       Zeichnen betrifft ohnehin nur freie Zellen und Leitungen. */
    const cell = grid[`${c[0]},${c[1]}`];
    if (cell && cell.type !== "wire") {
      /* Auf einem Bauteil steckt beides: ein Tippen schaltet es, ein Zug davon
         weg beginnt eine Leitung – sonst müsste man die Nachbarzelle treffen,
         statt einfach an der Quelle anzusetzen. Was gemeint war, entscheidet
         sich erst beim Loslassen, das Tippen wartet deshalb.
         Der Taster ist die Ausnahme: er leitet nur, solange er gedrückt ist. */
      drawing.current = true;
      if (cell.type === "button") {
        drawing.current = false;
        interact(c[0], c[1]);
      } else tap.current = c;
      return;
    }
    if (PLACEABLE.has(tool)) {
      /* Im Level wird ein Messgerät genau einmal eingesetzt und danach verdrahtet;
         das Werkzeug springt deshalb gleich auf Verdrahten zurück. Nur bei
         gelungener Platzierung – sonst zöge der zweite Versuch eine Leitung,
         statt das falsch gedrehte Gerät noch einmal zu setzen. Beim Frei bauen
         bleibt das Werkzeug stehen: dort setzt man mehrere gleiche Bauteile. */
      if (mode === "level" && METER.has(tool) && canPlace(grid, c[0], c[1], tool, orient))
        setTool("wire");
      return placeComp(c[0], c[1], tool);
    }
    drawing.current = true;
    setWire(c[0], c[1]);
  };

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    if (!drawing.current) return;
    const c = eventCell(e);
    if (!c) return;
    /* verlässt der Zeiger die Startzelle, ist es ein Zug und kein Tippen */
    if (tap.current && (c[0] !== tap.current[0] || c[1] !== tap.current[1])) tap.current = null;
    // Schnelle gerade Züge überspringen Zeigerereignisse, dürfen aber keine Lücken lassen.
    const prev = lastCell.current;
    const cells: [number, number][] = [c];
    if (prev && (prev[0] === c[0] || prev[1] === c[1])) {
      const dx = Math.sign(c[0] - prev[0]),
        dy = Math.sign(c[1] - prev[1]);
      const distance = Math.max(Math.abs(c[0] - prev[0]), Math.abs(c[1] - prev[1]));
      for (let i = 1; i < distance; i++) cells.push([prev[0] + dx * i, prev[1] + dy * i]);
    }
    lastCell.current = c;
    for (const [x, y] of cells) {
      if (tool === "wire") setWire(x, y);
      else if (tool === "erase") eraseCell(x, y);
    }
  };

  /* Loslassen über dem Feld schaltet das Bauteil, auf dem der Zug begann.
     Beim Verlassen des Feldes gilt die Geste als abgebrochen – ein Bauteil am
     Rand soll nicht schalten, nur weil man darüber hinausgezogen hat. */
  const stop = (keep: boolean) => {
    setIsDrawing(false);
    lastCell.current = null;
    drawing.current = false;
    const t = tap.current;
    tap.current = null;
    if (keep && t) interact(t[0], t[1]);
    release();
  };

  const handlers: BoardPointerHandlers = {
    onPointerDown: onDown,
    onPointerMove: onMove,
    onPointerUp: () => stop(true),
    onPointerLeave: () => stop(false),
    onPointerCancel: () => stop(false),
  };

  return {
    grid,
    setGrid,
    tool,
    setTool,
    orient,
    setOrient,
    isDrawing,
    svgRef,
    handlers,
    /** Taster von außen betätigen (Funktionsansicht) */
    press: interact,
    release,
    /** laufende Geste abbrechen */
    cancelGesture: () => stop(false),
  };
}
