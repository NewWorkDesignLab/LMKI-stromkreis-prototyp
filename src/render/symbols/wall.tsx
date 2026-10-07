import { WALL } from "../../theme/colors";
import { center } from "../geometry";

export function wallEl(x, y) {
  const cx = center(x),
    cy = center(y);
  return (
    <g key={`wl${x},${y}`}>
      <rect x={cx - 26} y={cy - 26} width={52} height={52} rx={6} fill={WALL} />
      <line x1={cx - 18} y1={cy - 18} x2={cx + 18} y2={cy + 18} stroke="#cbc4b3" strokeWidth={3} />
      <line x1={cx - 18} y1={cy + 18} x2={cx + 18} y2={cy - 18} stroke="#cbc4b3" strokeWidth={3} />
    </g>
  );
}
