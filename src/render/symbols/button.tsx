import { LIVE, SWITCH_ON, SWITCH_OFF, FORBID, INK } from "../../theme/colors";
import { center } from "../geometry";
import { box } from "./primitives";
import { ports } from "./primitives";
import { contactEls, leverAt, leverTip, toBoard, type Uw } from "./switch";

/* Druckbetätigung nach DIN: gestrichelte Wirkverbindung vom Hebel zum Druckknopf
   (Strich mit zwei Beinen zum Kontakt hin). Sie greift bei u = −4 am Hebel an und
   bleibt dort, damit der Knopf beim Drücken nur senkrecht wandert. */
const ACT_U = -4;
const KNOB_HALF = 6;
const KNOB_LEG = 3;
/* Der Knopf sitzt außerhalb der Kachel (Rand bei 17, Zelle bis 30): innen reicht der
   Platz neben dem Hebel nicht, um Stößel und Knopf erkennbar zu zeichnen. Gedrückt
   rückt er bis an den Rand. */
const KNOB_REST = -25;
const KNOB_PRESSED = -20;

/* Taster: leitet nur, solange gedrückt. Mit nc ein Ruhetaster (Öffner): er leitet in
   Ruhe und trennt beim Drücken. Der Hebel zeigt wie beim Schalter, ob er leitet. */
export function buttonEl(x, y, c, glow) {
  const cx = center(x),
    cy = center(y);
  const on = !!c.closed,
    nc = !!c.nc,
    pressed = nc ? !on : on;
  const col = on ? (glow ? LIVE : SWITCH_ON) : SWITCH_OFF;
  const edge = c.danger ? FORBID : INK;
  const p = toBoard(cx, cy, c.orient === "v");
  const knob = pressed ? KNOB_PRESSED : KNOB_REST;
  const knobPts: Uw[] = [
    [ACT_U - KNOB_HALF, knob + KNOB_LEG],
    [ACT_U - KNOB_HALF, knob],
    [ACT_U + KNOB_HALF, knob],
    [ACT_U + KNOB_HALF, knob + KNOB_LEG],
  ];
  const [a, b] = [p(leverAt(ACT_U, leverTip(nc, on))), p([ACT_U, knob])];
  return (
    <g key={`bt${x},${y}`}>
      {box(cx, cy, edge)}
      {ports(cx, cy, c)}
      {contactEls(cx, cy, c.orient === "v", nc, on, col, edge)}
      <line
        x1={a[0]}
        y1={a[1]}
        x2={b[0]}
        y2={b[1]}
        stroke={edge}
        strokeWidth={2}
        strokeDasharray="3 2"
      />
      <polyline
        points={knobPts.map((q) => p(q).join(",")).join(" ")}
        fill="none"
        stroke={edge}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}
