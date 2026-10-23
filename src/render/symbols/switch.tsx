import { LIVE, SWITCH_ON, SWITCH_OFF, FORBID, INK } from "../../theme/colors";
import { center } from "../geometry";
import { box } from "./primitives";
import { ports } from "./primitives";

/* Schaltkontakt in Bauteilkoordinaten: u längs der Leitung, w quer dazu (negativ =
   Seite, zu der der Hebel öffnet). Schalter und Taster teilen sich diese Geometrie,
   der Taster setzt nur die Druckbetätigung darauf. */
export type Uw = [u: number, w: number];
const ROOT: Uw = [-15, 0];
const TERMINAL: Uw = [15, 0];
/* Ruhekontakt des Öffners: Querstrich, an dem der Hebel anliegt */
const NC_STOP = 11;
const NC_STOP_HALF = 9;
/* offener Hebel, rund 30° gegen die Leitung wie im DIN-Schaltzeichen */
const OPEN: Uw = [5, -11];

export const toBoard =
  (cx: number, cy: number, v: boolean) =>
  ([u, w]: Uw): [number, number] =>
    v ? [cx - w, cy - u] : [cx + u, cy + w];

/** Hebelspitze: geschlossen am Gegenkontakt (beim Öffner am Querstrich), sonst offen. */
export const leverTip = (nc: boolean, closed: boolean): Uw =>
  closed ? (nc ? [NC_STOP, 0] : TERMINAL) : OPEN;

/** Querabstand des Hebels an der Stelle u – dort setzt die Betätigung an. */
export function leverAt(u: number, tip: Uw): Uw {
  return [u, (tip[1] * (u - ROOT[0])) / (tip[0] - ROOT[0])];
}

/* `closed` heißt überall „leitet“. Ein Öffner startet deshalb mit closed: true, und
   der Querstrich am festen Anschluss – der Kontakt, gegen den der Hebel drückt – ist
   die Unterscheidung zum Schließer. */
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
  const [s1, s2] = [p([NC_STOP, -NC_STOP_HALF]), p([NC_STOP, NC_STOP_HALF])];
  return (
    <>
      {nc && (
        <line
          x1={s1[0]}
          y1={s1[1]}
          x2={s2[0]}
          y2={s2[1]}
          stroke={edge}
          strokeWidth={2.5}
          strokeLinecap="round"
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
