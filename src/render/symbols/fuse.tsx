import { LIVE, INK, HOT } from "../../theme/colors";
import { center } from "../geometry";
import { box } from "./primitives";
import { ports } from "./primitives";

export function fuseEl(x, y, c, glow, tripped) {
  const cx = center(x),
    cy = center(y),
    v = c.orient === "v";
  const col = tripped ? HOT : glow ? LIVE : INK;
  return (
    <g key={`f${x},${y}`}>
      {box(cx, cy)}
      <rect
        x={v ? cx - 7 : cx - 12}
        y={v ? cy - 12 : cy - 7}
        width={v ? 14 : 24}
        height={v ? 24 : 14}
        rx={2}
        fill="#fff"
        stroke={col}
        strokeWidth={2.5}
      />
      {tripped ? (
        v ? (
          <>
            <line x1={cx} y1={cy - 12} x2={cx} y2={cy - 3} stroke={col} strokeWidth={2.5} />
            <line x1={cx} y1={cy + 3} x2={cx} y2={cy + 12} stroke={col} strokeWidth={2.5} />
          </>
        ) : (
          <>
            <line x1={cx - 12} y1={cy} x2={cx - 3} y2={cy} stroke={col} strokeWidth={2.5} />
            <line x1={cx + 3} y1={cy} x2={cx + 12} y2={cy} stroke={col} strokeWidth={2.5} />
          </>
        )
      ) : v ? (
        <line x1={cx} y1={cy - 12} x2={cx} y2={cy + 12} stroke={col} strokeWidth={2.5} />
      ) : (
        <line x1={cx - 12} y1={cy} x2={cx + 12} y2={cy} stroke={col} strokeWidth={2.5} />
      )}
      {ports(cx, cy, c, tripped ? HOT : INK, 17)}
    </g>
  );
}
