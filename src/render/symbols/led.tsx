import { LAMP_ON, INK, HOT } from "../../theme/colors";
import { center } from "../geometry";

export function ledEl(x, y, c, on, over) {
  const cx = center(x),
    cy = center(y),
    v = c.orient === "v";
  const rot = v ? (c.rev ? 180 : 0) : c.rev ? 90 : 270;
  const col = over ? HOT : on ? LAMP_ON : "#fff";
  return (
    <g key={`d${x},${y}`}>
      {on && <circle cx={cx} cy={cy} r={20} fill={over ? HOT : LAMP_ON} className="lamp-on-glow" />}
      <g transform={`rotate(${rot} ${cx} ${cy})`}>
        <path
          d={`M ${cx - 9} ${cy - 8} L ${cx + 9} ${cy - 8} L ${cx} ${cy + 6} Z`}
          fill={col}
          stroke={over ? HOT : INK}
          strokeWidth={2}
          strokeLinejoin="round"
        />
        <line
          x1={cx - 10}
          y1={cy + 8}
          x2={cx + 10}
          y2={cy + 8}
          stroke={over ? HOT : INK}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        {on && (
          <>
            <line
              x1={cx + 9}
              y1={cy - 12}
              x2={cx + 15}
              y2={cy - 18}
              stroke={LAMP_ON}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            <line
              x1={cx + 13}
              y1={cy - 7}
              x2={cx + 19}
              y2={cy - 13}
              stroke={LAMP_ON}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
          </>
        )}
      </g>
    </g>
  );
}
