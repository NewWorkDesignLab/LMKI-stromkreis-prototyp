import { LIVE, SWITCH_ON, SWITCH_OFF, FORBID, INK } from "../../theme/colors";
import { center } from "../geometry";
import { box } from "./primitives";
import { ports } from "./primitives";

export function switchEl(x, y, c, glow) {
  const cx = center(x),
    cy = center(y),
    v = c.orient === "v",
    on = !!c.closed;
  const t1 = v ? [cx, cy + 15] : [cx - 15, cy];
  /* Beim Öffner endet der Hebel am Ruhekontakt, statt bis zum Anschluss zu laufen –
     er liegt sichtbar an dem Querstrich an, gegen den er drückt. */
  const t2 = c.nc ? (v ? [cx, cy - 11] : [cx + 11, cy]) : v ? [cx, cy - 15] : [cx + 15, cy];
  const open = v ? [cx + 11, cy - 5] : [cx + 5, cy - 11];
  const col = on ? (glow ? LIVE : SWITCH_ON) : SWITCH_OFF;
  const edge = c.danger ? FORBID : INK;
  return (
    <g key={`s${x},${y}`}>
      {box(cx, cy, edge)}
      {ports(cx, cy, c)}
      {c.nc &&
        (v ? (
          <line
            x1={cx - 9}
            y1={cy - 11}
            x2={cx + 9}
            y2={cy - 11}
            stroke={edge}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        ) : (
          <line
            x1={cx + 11}
            y1={cy - 9}
            x2={cx + 11}
            y2={cy + 9}
            stroke={edge}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        ))}
      <line
        x1={t1[0]}
        y1={t1[1]}
        x2={on ? t2[0] : open[0]}
        y2={on ? t2[1] : open[1]}
        stroke={col}
        strokeWidth={5}
        strokeLinecap="round"
      />
    </g>
  );
}

/* Taster: Schließer, leitet nur solange gedrückt */
/* Taster. Mit nc ein Ruhetaster (Öffner): der Kontaktbalken liegt im
   Ruhezustand AUF der Leitung und wird beim Drücken von ihr weggeschoben –
   beim Schließer ist es genau umgekehrt. */
