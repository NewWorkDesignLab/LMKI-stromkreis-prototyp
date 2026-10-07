import { LIVE, INK } from "../../theme/colors";
import { center } from "../geometry";
import { box } from "./primitives";
import { ports } from "./primitives";

export function resistorEl(x, y, c, glow) {
  const cx = center(x),
    cy = center(y),
    v = c.orient === "v";
  return (
    <g key={`r${x},${y}`}>
      {box(cx, cy)}
      <rect
        x={v ? cx - 8 : cx - 12}
        y={v ? cy - 12 : cy - 8}
        width={v ? 16 : 24}
        height={v ? 24 : 16}
        rx={2}
        fill="#fff"
        stroke={glow ? LIVE : INK}
        strokeWidth={2.5}
      />
      {ports(cx, cy, c, INK, 17)}
    </g>
  );
}
