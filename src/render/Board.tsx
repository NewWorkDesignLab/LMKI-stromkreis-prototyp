import type { PointerEventHandler, ReactNode, RefObject } from "react";
import type { CellKey, Grid, LevelDef, SimResult, ToolId } from "../domain/types";
import { fmtA, fmtR, fmtV } from "../engine/format";
import { CONSUMER, P } from "../engine/parts";
import { BG, DOT, FLOW, HOT, INK, LIVE, MUTE, WIRE } from "../theme/colors";
import { CELL, PAD_B, PAD_X, center } from "./geometry";
import { cellGlyph } from "./symbols";
import { wallEl } from "./symbols/wall";

export interface BoardPointerHandlers {
  onPointerDown: PointerEventHandler<SVGSVGElement>;
  onPointerMove: PointerEventHandler<SVGSVGElement>;
  onPointerUp: PointerEventHandler<SVGSVGElement>;
  onPointerLeave: PointerEventHandler<SVGSVGElement>;
  onPointerCancel: PointerEventHandler<SVGSVGElement>;
}

interface Props {
  level: Pick<LevelDef, "W" | "H" | "frames" | "showValues" | "labelSwitches">;
  grid: Grid;
  sim: SimResult;
  tool: ToolId;
  svgRef: RefObject<SVGSVGElement>;
  handlers: BoardPointerHandlers;
  /** Zusätzliche Anzeige über allem (Einführung) */
  overlay?: ReactNode;
}

/* Das Spielfeld als SVG. Zeichnet nur: Zustand und Eingaben kommen von außen. */
export function Board({ level: cfg, grid, sim, tool, svgRef, handlers, overlay }: Props) {
  const { W, H } = cfg;
  const vbW = W * CELL + PAD_X * 2,
    vbH = H * CELL + PAD_B;

  const dotEls: ReactNode[] = [],
    wallEls: ReactNode[] = [],
    lineEls: ReactNode[] = [],
    flowEls: ReactNode[] = [],
    nodeEls: ReactNode[] = [],
    compEls: ReactNode[] = [],
    labelEls: ReactNode[] = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      dotEls.push(<circle key={`d${x},${y}`} cx={center(x)} cy={center(y)} r={1.6} fill={DOT} />);

  /* Gerätegrenze: gestrichelter Rahmen, der mehrere Zellen als EIN Bauteil
     zusammenfasst – die Konvention aus dem Installationsplan. Reines Dekor,
     die Simulation sieht ihn nicht. */
  const frameEls = (cfg.frames || []).map((f, i) => (
    <rect
      key={`fr${i}`}
      x={f.x * CELL + 7}
      y={f.y * CELL + 7}
      width={f.w * CELL - 14}
      height={f.h * CELL - 14}
      rx={12}
      fill="none"
      stroke={MUTE}
      strokeWidth={2}
      strokeDasharray="5 6"
    />
  ));

  sim.lines.forEach((ln, i) => {
    /* gegen die Stromrichtung gezeichnete Stücke werden umgedreht – die Striche
       laufen immer vom Anfang zum Ende der Linie */
    const [p, q] = ln.dir < 0 ? [ln.b, ln.a] : [ln.a, ln.b];
    const x1 = center(p[0]),
      y1 = center(p[1]),
      x2 = center(q[0]),
      y2 = center(q[1]);
    lineEls.push(
      <line
        key={`ln${i}`}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={ln.live ? (sim.short ? HOT : LIVE) : WIRE}
        strokeWidth={8}
        strokeLinecap="round"
      />,
    );
    /* Ohne Strom keine laufenden Striche: die Leitung steht unter Spannung,
       aber ein Zweig ohne Strom bekäme sonst eine erfundene Richtung. */
    if (ln.live && ln.dir)
      flowEls.push(
        <line
          key={`fl${i}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={FLOW}
          strokeWidth={3.5}
          strokeLinecap="round"
          className={sim.short ? "flow fast" : "flow"}
        />,
      );
  });

  /* Beschriftungen stehen immer mittig unter ihrer Zelle – auch am Brettrand,
     denn die viewBox reicht dort um PAD_X über das Spielfeld hinaus. */
  const label = (k: CellKey, txt: string) => {
    const [x, y] = k.split(",").map(Number);
    labelEls.push(
      <text
        key={`t${k}`}
        x={center(x)}
        y={center(y) + 27}
        textAnchor="middle"
        fontSize={10.5}
        fontWeight="600"
        fill={INK}
        stroke={BG}
        strokeWidth={3}
        paintOrder="stroke"
      >
        {txt}
      </text>,
    );
  };

  for (const [k, c] of Object.entries(grid)) {
    if (c.type === "wall") {
      wallEls.push(wallEl(...(k.split(",").map(Number) as [number, number])));
      continue;
    }
    if (c.type === "wire") {
      const [x, y] = k.split(",").map(Number),
        d = sim.deg[k] || 0;
      /* Knotenpunkt: groß und mit hellem Ring, sonst geht er auf der
         stromführenden Leitung farblich unter. Loses Ende: kleiner Kreis. */
      const node = d >= 3,
        r = node ? 7 : d <= 1 ? 4 : 0;
      if (r)
        nodeEls.push(
          <circle
            key={`wn${k}`}
            cx={center(x)}
            cy={center(y)}
            r={r}
            fill={sim.liveNode.has(`w:${k}`) ? (sim.short ? HOT : LIVE) : WIRE}
            stroke={node ? BG : "none"}
            strokeWidth={node ? 2.5 : 0}
          />,
        );
      continue;
    }
    compEls.push(cellGlyph(k, c, sim));
    /* Messwerte und Bauteilwerte */
    if (c.type === "ammeter") label(k, fmtA(sim.cur[k] || 0));
    else if (c.type === "voltmeter") label(k, fmtV(sim.volt[k] || 0));
    else if (c.type === "resistor")
      label(k, fmtR(P(c, "r")) + ((P(c, "values") || []).length > 1 ? " ⟳" : ""));
    else if (c.type === "fuse") label(k, sim.tripped.has(k) ? "ausgelöst ⟳" : fmtA(P(c, "imax")));
    /* Ein Öffner ist am Symbol allein zu leicht zu übersehen – er sagt es dazu. */
    else if ((c.type === "switch" || c.type === "button") && (c.name || c.nc || cfg.labelSwitches))
      label(k, c.name || (c.nc ? "Öffner" : "Schließer"));
    else if (cfg.showValues) {
      if (c.type === "battery") label(k, `${fmtV(P(c, "u"))} · ${fmtA(sim.cur[k] || 0)}`);
      else if (CONSUMER.has(c.type))
        label(k, sim.blocked.has(k) ? "sperrt" : fmtA(sim.cur[k] || 0));
    }
  }

  return (
    <div className="relative rounded-2xl p-2 shadow-inner" style={{ background: BG }}>
      <svg
        ref={svgRef}
        viewBox={`${-PAD_X} 0 ${vbW} ${vbH}`}
        className="block mx-auto select-none"
        style={{
          width: "100%",
          maxWidth: Math.min(W * CELL, 560) + PAD_X * 2,
          height: "auto",
          touchAction: "none",
          cursor: tool === "erase" ? "cell" : "pointer",
        }}
        {...handlers}
      >
        <rect x={0} y={0} width={W * CELL} height={H * CELL} fill={BG} rx={10} />
        {dotEls}
        {frameEls}
        {wallEls}
        {lineEls}
        {flowEls}
        {nodeEls}
        {compEls}
        {labelEls}
        {overlay}
      </svg>
    </div>
  );
}
