import {
  Fragment,
  type MouseEventHandler,
  type PointerEventHandler,
  type ReactNode,
  type RefObject,
} from "react";
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
import { fmtA, fmtR, fmtV, ratingLines } from "../engine/format";
import { CONSUMER, P } from "../engine/parts";
import {
  BG,
  DOT,
  FLOW,
  FORBID,
  GHOST,
  HINT,
  HOT,
  INK,
  LIVE,
  MUTE,
  RATING,
  WIRE,
} from "../theme/colors";
import { EMPTY_SIM } from "./emptySim";
import { FORMELZEICHEN } from "./formelzeichen";
import { CELL, PAD_X, boardExtent, center } from "./geometry";
import { partGlyph } from "./symbols";
import { wallEl } from "./symbols/wall";

export interface BoardPointerHandlers {
  onPointerDown: PointerEventHandler<SVGSVGElement>;
  onPointerMove?: PointerEventHandler<SVGSVGElement>;
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
  level: Pick<BuildStep, "W" | "H" | "walls" | "frames" | "ratings" | "labelSwitches">;
  circuit: Circuit;
  sim: SimResult;
  /* Ohne Werkzeug und Zeigerereignisse ist das Brett nur zum Ansehen (Bühne neben
     Vermutung, Frage und Merksatz). */
  tool?: ToolId;
  /** schrumpft mit dem Behälter mit; Standard: ja, wenn das Brett nicht bedient wird (der
      Rahmen im Bauschritt bestimmt dort die Größe selbst) */
  fit?: boolean;
  svgRef?: RefObject<SVGSVGElement>;
  handlers?: BoardPointerHandlers;
  hint?: BoardHint | null;
  /** Zusätzliche Anzeige über allem (Einführung) */
  overlay?: ReactNode;
  /** Darstellungsgröße in Bildpunkten; Zoom und Lage bestimmt der Rahmen (BoardViewport) */
  width: number;
  height: number;
  /** laufende Striche in stromführenden Leitungen (Einstellung) */
  flow: boolean;
  /** Betriebswerte (Ströme) an Quelle und Verbrauchern statt der Kennwerte: im Merksatz und
      beim Frei bauen. Beim Bauen im Level zeigen sie nur die Messgeräte. */
  live?: boolean;
  /** Skizze statt Spielfeld: blass und grau-blau (Ghost-Schaltung) */
  tone?: "ghost";
  /** ersetzt die eingebaute Beschriftung; Bauteile ohne Eintrag bleiben unbeschriftet */
  labels?: Record<PartId, string>;
  /** hervorgehobene Bauteile; die übrigen treten zurück */
  focus?: readonly PartId[];
}

/* Grau-blau statt der Bauteilfarben: die Skizze soll begleiten, nicht nach Spielfeld
   aussehen. Ein Filter statt eigener Symbolfarben – die Symbole bleiben eine Wahrheit. */
const GHOST_FILTER = "grayscale(1) sepia(0.4) hue-rotate(180deg)";

const segEnds = (k: WireKey) => wireEnds(k).map(parsePoint);

/* Beschriftung mit Formelzeichen („R_V = ?“): Zeichen kursiv, Index tiefgestellt. */
const formel = (txt: string): ReactNode =>
  txt.split(/(\s+)/).map((token, n) => {
    const m = FORMELZEICHEN.exec(token);
    if (!m) return token;
    return (
      <Fragment key={n}>
        <tspan fontStyle="italic" fontFamily="serif">
          {m[1]}
        </tspan>
        {m[2] && (
          <tspan baselineShift="sub" fontSize="0.75em">
            {m[2]}
          </tspan>
        )}
        {m[3]}
      </Fragment>
    );
  });

/* Das Spielfeld als SVG. Zeichnet nur: Zustand und Eingaben kommen von außen. */
export function Board({
  level: cfg,
  circuit,
  sim,
  tool,
  fit,
  svgRef,
  handlers,
  hint,
  overlay,
  width,
  height,
  flow: animate,
  live,
  tone,
  labels,
  focus,
}: Props) {
  const ghost = tone === "ghost";
  const focused = new Set(focus ?? []);
  const { W, H } = cfg;
  const { w: vbW, h: vbH } = boardExtent(W, H);

  const dotEls: ReactNode[] = [],
    lineEls: ReactNode[] = [],
    flowEls: ReactNode[] = [],
    nodeEls: ReactNode[] = [],
    compEls: ReactNode[] = [],
    focusEls: ReactNode[] = [],
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
    if (animate && flow.live && flow.dir)
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
  /* Kennwerte stehen wie ein Aufdruck am Bauteil (printed: klein, grau), Mess- und
     Betriebswerte kräftig in Tinte. So sieht man ohne Erklärung, was gemessen ist. */
  const label = (id: PartId, c: Part, txt: string | string[], printed = false) =>
    labelEls.push(
      <text
        key={`t${id}`}
        x={center(c.x)}
        y={center(c.y) + 27}
        textAnchor="middle"
        fontSize={printed ? 9.5 : 10.5}
        fontWeight={printed ? "500" : "600"}
        fill={ghost ? GHOST : printed ? RATING : INK}
        stroke={BG}
        strokeWidth={3}
        paintOrder="stroke"
      >
        {typeof txt === "string"
          ? formel(txt)
          : txt.map((line, n) => (
              <tspan key={n} x={center(c.x)} dy={n ? 12 : 0}>
                {formel(line)}
              </tspan>
            ))}
      </text>,
    );

  for (const [id, c] of Object.entries(circuit.parts)) {
    if (focused.has(id)) {
      /* flach statt rund: die Beschriftung 27 px unter der Mitte bleibt frei */
      focusEls.push(
        <rect
          key={`fx${id}`}
          x={center(c.x) - CELL * 0.4}
          y={center(c.y) - CELL * 0.3}
          width={CELL * 0.8}
          height={CELL * 0.6}
          rx={9}
          fill={BG}
          stroke={GHOST}
          strokeWidth={3}
        />,
        partGlyph(id, c, sim),
      );
    } else compEls.push(partGlyph(id, c, sim));
    if (labels) {
      if (labels[id]) label(id, c, labels[id]);
      continue;
    }
    /* Messwerte und Bauteilwerte; ✎ = Wert frei eintragbar, ⟳ = Wert weiterschalten */
    if (c.type === "ammeter") label(id, c, fmtA(sim.cur[id] || 0));
    else if (c.type === "voltmeter") label(id, c, fmtV(sim.volt[id] || 0));
    else if (c.type === "resistor")
      label(
        id,
        c,
        fmtR(P(c, "r")) + (c.range ? " ✎" : (P(c, "values") || []).length > 1 ? " ⟳" : ""),
        true,
      );
    else if (c.type === "fuse")
      label(id, c, sim.tripped.has(id) ? "ausgelöst ⟳" : fmtA(P(c, "imax")), !sim.tripped.has(id));
    /* Ein Öffner ist am Symbol allein zu leicht zu übersehen – er sagt es dazu. */
    else if ((c.type === "switch" || c.type === "button") && (c.name || c.nc || cfg.labelSwitches))
      label(id, c, c.name || (c.nc ? "Öffner" : "Schließer"));
    /* Betriebswerte nur, wo es ausdrücklich gewollt ist (Merksatz, Frei bauen) – beim Bauen
       zeigen sie die Messgeräte, die Bauteile tragen nur ihre Kennwerte. */
    else if (live) {
      if (c.type === "battery") label(id, c, `${fmtV(P(c, "u"))} · ${fmtA(sim.cur[id] || 0)}`);
      else if (CONSUMER.has(c.type))
        label(id, c, sim.blocked.has(id) ? "sperrt" : fmtA(sim.cur[id] || 0));
    } else if (cfg.ratings) {
      const lines = ratingLines(c, cfg.ratings === "resistance");
      if (lines.length) label(id, c, lines, true);
    }
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`${-PAD_X} 0 ${vbW} ${vbH}`}
      width={width}
      height={height}
      className="block select-none"
      style={{
        ...(handlers && { touchAction: "none", cursor: tool === "erase" ? "cell" : "pointer" }),
        ...((fit ?? !handlers) && { maxWidth: "100%", height: "auto" }),
      }}
      {...handlers}
    >
      <rect x={0} y={0} width={W * CELL} height={H * CELL} fill={BG} rx={10} />
      {/* Hervorgehobenes steht in der Skizze kräftig vor dem blassen Rest */}
      <g style={ghost ? { filter: GHOST_FILTER, opacity: focused.size ? 0.35 : 0.6 } : undefined}>
        {dotEls}
        {frameEls}
        {wallEls}
        {lineEls}
        {flowEls}
        {nodeEls}
        {compEls}
      </g>
      <g style={ghost ? { filter: GHOST_FILTER } : undefined}>{focusEls}</g>
      {labelEls}
      {hint && <HintLayer hint={hint} />}
      {overlay}
    </svg>
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
