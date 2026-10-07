import { BG, WIRE, LIVE } from "../../theme/colors";
import { center } from "../geometry";

export function crossEl(x, y, hv, vv) {
  const cx = center(x),
    cy = center(y);
  return (
    <g key={`xx${x},${y}`}>
      <line
        x1={cx}
        y1={cy - 30}
        x2={cx}
        y2={cy + 30}
        stroke={vv ? LIVE : WIRE}
        strokeWidth={8}
        strokeLinecap="round"
      />
      <path
        d={`M ${cx - 30} ${cy} L ${cx - 9} ${cy} A 9 9 0 0 0 ${cx + 9} ${cy} L ${cx + 30} ${cy}`}
        fill="none"
        stroke={BG}
        strokeWidth={13}
        strokeLinecap="round"
      />
      <path
        d={`M ${cx - 30} ${cy} L ${cx - 9} ${cy} A 9 9 0 0 0 ${cx + 9} ${cy} L ${cx + 30} ${cy}`}
        fill="none"
        stroke={hv ? LIVE : WIRE}
        strokeWidth={8}
        strokeLinecap="round"
      />
    </g>
  );
}
