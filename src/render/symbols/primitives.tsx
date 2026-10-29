import { INK } from "../../theme/colors";
import { sidesOf } from "../../engine/parts";

export const box = (cx, cy, col = INK) => (
  <rect
    x={cx - 17}
    y={cy - 17}
    width={34}
    height={34}
    rx={8}
    fill="#fff"
    stroke={col}
    strokeWidth={2}
  />
);

/* Anschlusspunkte: zeigen, an welchen zwei Seiten das Bauteil leitet.
   r = Umriss des Symbols (Kreis 15, Box 17), col = dessen Umrissfarbe –
   der Punkt sitzt auf der Kante und ragt ein Stück heraus. */
const PORT = { N: [0, -1], S: [0, 1], W: [-1, 0], E: [1, 0] };
export const ports = (cx, cy, c, col = INK, r = 15) =>
  sidesOf(c).map((s) => (
    <circle key={s} cx={cx + PORT[s][0] * r} cy={cy + PORT[s][1] * r} r={3} fill={col} />
  ));
