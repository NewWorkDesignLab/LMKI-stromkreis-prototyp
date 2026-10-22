import type { MouseEventHandler, PointerEventHandler, ReactNode, RefObject } from "react";
import type {
  Circuit,
  BuildStep,
  Part,
  PartId,
  PointKey,
  SimResult,
  ToolId,
  WireKey,
} from "../domain/types";
import { parsePoint, wireEnds } from "../engine/circuit";
import { fmtA, fmtR, fmtV } from "../engine/format";
import { CONSUMER, P } from "../engine/parts";
import { BG, DOT, FLOW, FORBID, HINT, HOT, INK, LIVE, MUTE, WIRE } from "../theme/colors";
import { EMPTY_SIM } from "./emptySim";
import { CELL, PAD_B, PAD_X, center } from "./geometry";
import { partGlyph } from "./symbols";
import { wallEl } from "./symbols/wall";

export interface BoardPointerHandlers {
  onPointerDown: PointerEventHandler<SVGSVGElement>;
  onPointerMove: PointerEventHandler<SVGSVGElement>;
  onPointerUp: PointerEventHandler<SVGSVGElement>;
  onPointerLeave: PointerEventHandler<SVGSVGElement>;
  onPointerCancel: PointerEventHandler<SVGSVGElement>;
  onContextMenu: MouseEventHandler<SVGSVGElement>;
}

/** Was das Brett unter dem Zeiger hervorhebt, damit klar ist, was die Geste bewirkt. */
export type BoardHint =
  /** Verdrahten: der Punkt, an dem die Leitung ansetzt bzw. gerade steht */
  | { kind: "point"; at: PointKey }
  /** Bauteil setzen: Vorschau, ok = passt dort hin */
  | { kind: "ghost"; part: Part; ok: boolean }
  /** Löschen: Bauteil oder Leitungsknoten an diesem Punkt */
  | { kind: "erasePoint"; at: PointKey }
  /** Löschen: genau diese Leitung */
  | { kind: "eraseWire"; key: WireKey };

interface Props {
  level: Pick<BuildStep, "W" | "H" | "walls" | "frames" | "showValues" | "labelSwitches">;
  circuit: Circuit;
  sim: SimResult;
  tool: ToolId;
  svgRef: RefObject<SVGSVGElement>;
  handlers: BoardPointerHandlers;
  hint?: BoardHint | null;
  /** Zusätzliche Anzeige über allem (Einführung) */
  overlay?: ReactNode;
}

const segEnds = (k: WireKey) => wireEnds(k).map(parsePoint);

/* Das Spielfeld als SVG. Zeichnet nur: Zustand und Eingaben kommen von außen. */
export function Board({ level: cfg, circuit, sim, tool, svgRef, handlers, hint, overlay }: Props) {
  const { W, H } = cfg;
  const vbW = W * CELL + PAD_X * 2,
    vbH = H * CELL + PAD_B;

  const dotEls: ReactNode[] = [],
    lineEls: ReactNode[] = [],
    flowEls: ReactNode[] = [],
    nodeEls: ReactNode[] = [],
    compEls: ReactNode[] = [],
    labelEls: ReactNode[] = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      dotEls.push(<circle key={`d${x},${y}`} cx={center(x)} cy={center(y)} r={1.6} fill={DOT} />);

  const wallEls = (cfg.walls || []).map((p) => wallEl(...parsePoint(p)));

  /* Gerätegrenze: gestrichelter Rahmen, der mehrere Punkte als EIN Bauteil
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

  for (const k of Object.keys(circuit.wires)) {
    const flow = sim.wires[k] ?? { live: false, dir: 0 };
    /* gegen die Stromrichtung gezeichnete Stücke werden umgedreht – die Striche
       laufen immer vom Anfang zum Ende der Linie */
    const [a, b] = segEnds(k);
    const [p, q] = flow.dir < 0 ? [b, a] : [a, b];
    const x1 = center(p[0]),
      y1 = center(p[1]),
      x2 = center(q[0]),
      y2 = center(q[1]);
    lineEls.push(
      <line
        key={`ln${k}`}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={flow.live ? (sim.short ? HOT : LIVE) : WIRE}
        strokeWidth={8}
        strokeLinecap="round"
      />,
    );
    /* Ohne Strom keine laufenden Striche: die Leitung steht unter Spannung,
       aber ein Zweig ohne Strom bekäme sonst eine erfundene Richtung. */
    if (flow.live && flow.dir)
      flowEls.push(
        <line
          key={`fl${k}`}
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
  }

  /* Knotenpunkt: groß und mit hellem Ring, sonst geht er auf der stromführenden
     Leitung farblich unter. Loses Ende: kleiner Kreis. */
  for (const [p, st] of Object.entries(sim.points)) {
    const node = st.deg >= 3,
      r = node ? 7 : st.deg <= 1 ? 4 : 0;
    if (!r) continue;
    const [x, y] = parsePoint(p);
    nodeEls.push(
      <circle
        key={`wn${p}`}
        cx={center(x)}
        cy={center(y)}
        r={r}
        fill={st.live ? (sim.short ? HOT : LIVE) : WIRE}
        stroke={node ? BG : "none"}
        strokeWidth={node ? 2.5 : 0}
      />,
    );
  }

  /* Beschriftungen stehen immer mittig unter ihrem Bauteil – auch am Brettrand,
     denn die viewBox reicht dort um PAD_X über das Spielfeld hinaus. */
  const label = (id: PartId, c: Part, txt: string) =>
    labelEls.push(
      <text
        key={`t${id}`}
        x={center(c.x)}
        y={center(c.y) + 27}
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

  for (const [id, c] of Object.entries(circuit.parts)) {
    compEls.push(partGlyph(id, c, sim));
    /* Messwerte und Bauteilwerte */
    if (c.type === "ammeter") label(id, c, fmtA(sim.cur[id] || 0));
    else if (c.type === "voltmeter") label(id, c, fmtV(sim.volt[id] || 0));
    else if (c.type === "resistor")
      label(id, c, fmtR(P(c, "r")) + ((P(c, "values") || []).length > 1 ? " ⟳" : ""));
    else if (c.type === "fuse")
      label(id, c, sim.tripped.has(id) ? "ausgelöst ⟳" : fmtA(P(c, "imax")));
    /* Ein Öffner ist am Symbol allein zu leicht zu übersehen – er sagt es dazu. */
    else if ((c.type === "switch" || c.type === "button") && (c.name || c.nc || cfg.labelSwitches))
      label(id, c, c.name || (c.nc ? "Öffner" : "Schließer"));
    else if (cfg.showValues) {
      if (c.type === "battery") label(id, c, `${fmtV(P(c, "u"))} · ${fmtA(sim.cur[id] || 0)}`);
      else if (CONSUMER.has(c.type))
        label(id, c, sim.blocked.has(id) ? "sperrt" : fmtA(sim.cur[id] || 0));
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
        {hint && <HintLayer hint={hint} />}
        {overlay}
      </svg>
    </div>
  );
}

/* Hinweis unter dem Zeiger. Nimmt keine Zeiger an, damit er die Geste nicht stört. */
function HintLayer({ hint }: { hint: BoardHint }) {
  if (hint.kind === "point" || hint.kind === "erasePoint") {
    const [x, y] = parsePoint(hint.at);
    const col = hint.kind === "point" ? HINT : FORBID;
    return (
      <circle
        cx={center(x)}
        cy={center(y)}
        r={hint.kind === "point" ? 10 : 24}
        fill="none"
        stroke={col}
        strokeWidth={2.5}
        strokeDasharray={hint.kind === "point" ? "none" : "4 4"}
        pointerEvents="none"
      />
    );
  }
  if (hint.kind === "eraseWire") {
    const [[x1, y1], [x2, y2]] = segEnds(hint.key);
    return (
      <line
        x1={center(x1)}
        y1={center(y1)}
        x2={center(x2)}
        y2={center(y2)}
        stroke={FORBID}
        strokeWidth={12}
        strokeLinecap="round"
        opacity={0.55}
        pointerEvents="none"
      />
    );
  }
  const { part, ok } = hint;
  return (
    <g pointerEvents="none">
      <rect
        x={center(part.x) - 27}
        y={center(part.y) - 27}
        width={54}
        height={54}
        rx={10}
        fill="none"
        stroke={ok ? HINT : FORBID}
        strokeWidth={2.5}
        strokeDasharray="5 4"
      />
      <g opacity={ok ? 0.55 : 0.3}>{partGlyph("vorschau", part, EMPTY_SIM)}</g>
    </g>
  );
}
