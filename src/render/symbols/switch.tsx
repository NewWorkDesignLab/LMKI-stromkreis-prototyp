import { LIVE, SWITCH_ON, SWITCH_OFF, FORBID, INK } from "../../theme/colors";
import { center } from "../geometry";
import { box } from "./primitives";
import { ports } from "./primitives";

/* Schaltkontakt in Bauteilkoordinaten: u längs der Leitung, w quer dazu (negativ =
   Seite, zu der sich der Hebel neigt und auf der die Betätigung sitzt – bei Schließer und
   Öffner gleich, wie im DIN-Schaltzeichen). Schalter und Taster teilen sich diese
   Geometrie, der Taster setzt nur die Druckbetätigung darauf. Die Box reicht bis ±17; mit
   halber Hebelbreite (2,5) bleibt jede Hebelspitze innerhalb von |w| ≤ 13. */
export type Uw = [u: number, w: number];
const ROOT: Uw = [-15, 0];
const TERMINAL: Uw = [15, 0];
/* offener Schließer, rund 30° gegen die Leitung wie im DIN-Schaltzeichen */
const OPEN: Uw = [5, -11];
/* Öffner nach DIN: der feste Kontakt endet in einem Haken, der zur Seite des Hebels
   zeigt; der Hebel liegt in Ruhe schräg daran an, ein Stück darüber hinaus. Vom Schließer
   unterscheidet ihn allein dieser Haken, deshalb bleibt er in jeder Stellung stehen.
   Betätigt kippt der Hebel weiter vom Haken weg, nicht zur Leitung hin – dort läge er
   dicht am festen Kontakt und sähe geschlossen aus. Beide Hebellagen sind gleich lang
   (≈ 22). */
const HOOK_U = 5;
const HOOK_W = -8;
const NC_REST: Uw = [6, -7.5];
const NC_OPEN: Uw = [3, -13];

export const toBoard =
  (cx: number, cy: number, v: boolean) =>
  ([u, w]: Uw): [number, number] =>
    v ? [cx - w, cy - u] : [cx + u, cy + w];

/** Hebelspitze: geschlossen am Gegenkontakt (beim Öffner am Haken), sonst offen. */
export const leverTip = (nc: boolean, closed: boolean): Uw =>
  nc ? (closed ? NC_REST : NC_OPEN) : closed ? TERMINAL : OPEN;

/** Querabstand des Hebels an der Stelle u – dort setzt die Betätigung an. */
export function leverAt(u: number, tip: Uw): Uw {
  return [u, (tip[1] * (u - ROOT[0])) / (tip[0] - ROOT[0])];
}

/* `closed` heißt überall „leitet“. Ein Öffner startet deshalb mit closed: true, und
   der Haken am festen Anschluss – der Kontakt, an dem der Hebel anliegt – ist die
   Unterscheidung zum Schließer. Er bleibt in Umrissfarbe, auch wenn Strom fließt: sonst
   verblasste beim Betätigen genau das Merkmal, an dem man den Öffner erkennt. */
export function contactEls(
  cx: number,
  cy: number,
  v: boolean,
  nc: boolean,
  closed: boolean,
  col: string,
  edge: string,
) {
  const p = toBoard(cx, cy, v);
  const [r, t] = [p(ROOT), p(leverTip(nc, closed))];
  const hook: Uw[] = [TERMINAL, [HOOK_U, 0], [HOOK_U, HOOK_W]];
  return (
    <>
      {nc && (
        <polyline
          points={hook.map((q) => p(q).join(",")).join(" ")}
          fill="none"
          stroke={edge}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      <line
        x1={r[0]}
        y1={r[1]}
        x2={t[0]}
        y2={t[1]}
        stroke={col}
        strokeWidth={5}
        strokeLinecap="round"
      />
    </>
  );
}

/* Schalter: bleibt in seiner Stellung; `nc` macht daraus einen Öffner. */
export function switchEl(x, y, c, glow) {
  const cx = center(x),
    cy = center(y),
    on = !!c.closed;
  const col = on ? (glow ? LIVE : SWITCH_ON) : SWITCH_OFF;
  const edge = c.danger ? FORBID : INK;
  return (
    <g key={`s${x},${y}`}>
      {box(cx, cy, edge)}
      {ports(cx, cy, c)}
      {contactEls(cx, cy, c.orient === "v", !!c.nc, on, col, edge)}
    </g>
  );
}
