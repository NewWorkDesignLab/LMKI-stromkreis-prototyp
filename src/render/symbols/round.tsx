import { LIVE, LAMP_ON, INK } from "../../theme/colors";
import { center } from "../geometry";
import { ports } from "./primitives";

export function roundEl(x, y, label, glow, on) {
  const cx = center(x),
    cy = center(y);
  return (
    <g>
      {on && <circle cx={cx} cy={cy} r={20} fill={LAMP_ON} className="lamp-on-glow" />}
      <circle cx={cx} cy={cy} r={15} fill="#fff" stroke={glow ? LIVE : INK} strokeWidth={2} />
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize={14} fontWeight="700" fill={INK}>
        {label}
      </text>
    </g>
  );
}
export const motorEl = (x, y, c, glow, on) => (
  <g key={`m${x},${y}`}>
    {roundEl(x, y, "M", glow, on)}
    {ports(center(x), center(y), c, glow ? LIVE : INK)}
  </g>
);
export const meterEl = (x, y, c, glow, kind) => (
  <g key={`g${x},${y}`}>
    {roundEl(x, y, kind === "ammeter" ? "A" : "V", glow, false)}
    {ports(center(x), center(y), c, glow ? LIVE : INK)}
  </g>
);

export function buzzerEl(x, y, c, glow, on) {
  const cx = center(x),
    cy = center(y);
  return (
    <g key={`z${x},${y}`}>
      {on && <circle cx={cx} cy={cy} r={19} fill={LAMP_ON} className="lamp-on-glow" />}
      <path
        d={`M ${cx - 14} ${cy + 8} A 14 14 0 0 1 ${cx + 14} ${cy + 8} Z`}
        fill="#fff"
        stroke={glow ? LIVE : INK}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <line
        x1={cx - 14}
        y1={cy + 8}
        x2={cx + 14}
        y2={cy + 8}
        stroke={glow ? LIVE : INK}
        strokeWidth={2}
      />
      {ports(cx, cy, c, glow ? LIVE : INK)}
    </g>
  );
}
