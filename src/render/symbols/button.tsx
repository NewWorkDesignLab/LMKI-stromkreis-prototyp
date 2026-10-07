import { LIVE, SWITCH_ON, SWITCH_OFF, FORBID, INK } from "../../theme/colors";
import { center } from "../geometry";
import { box } from "./primitives";
import { ports } from "./primitives";

export function buttonEl(x, y, c, glow) {
  const cx = center(x),
    cy = center(y),
    v = c.orient === "v";
  const on = !!c.closed,
    pressed = c.nc ? !c.closed : !!c.closed;
  const col = on ? (glow ? LIVE : SWITCH_ON) : SWITCH_OFF;
  const t1 = v ? [cx, cy + 15] : [cx - 15, cy];
  const t2 = v ? [cx, cy - 15] : [cx + 15, cy];
  /* Der Kontaktbalken folgt der Betätigung: der Schließer wird auf den Kontakt
     gedrückt, der Öffner liegt schon darauf und wird von ihm weggeschoben. */
  const off = c.nc ? (pressed ? -7 : 0) : pressed ? 0 : 7;
  return (
    <g key={`bt${x},${y}`}>
      {box(cx, cy, c.danger ? FORBID : INK)}
      <line
        x1={t1[0]}
        y1={t1[1]}
        x2={t2[0]}
        y2={t2[1]}
        stroke={SWITCH_OFF}
        strokeWidth={2}
        opacity={0.4}
      />
      {ports(cx, cy, c)}
      {v ? (
        <>
          <line
            x1={cx - 9}
            y1={cy - off}
            x2={cx + 9}
            y2={cy - off}
            stroke={col}
            strokeWidth={4}
            strokeLinecap="round"
          />
          <line
            x1={cx}
            y1={cy - off}
            x2={cx}
            y2={cy - off - 8}
            stroke={col}
            strokeWidth={3}
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <line
            x1={cx + off}
            y1={cy - 9}
            x2={cx + off}
            y2={cy + 9}
            stroke={col}
            strokeWidth={4}
            strokeLinecap="round"
          />
          <line
            x1={cx + off}
            y1={cy}
            x2={cx + off + 8}
            y2={cy}
            stroke={col}
            strokeWidth={3}
            strokeLinecap="round"
          />
        </>
      )}
    </g>
  );
}

/* Wechselschalter: ein Anschluss (Wurzel), zwei Ausgänge */
