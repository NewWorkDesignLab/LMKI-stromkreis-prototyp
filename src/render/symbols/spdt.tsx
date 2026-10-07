import { spdtOuts } from "../../engine/parts";
import { LIVE, SWITCH_ON, SWITCH_OFF, INK } from "../../theme/colors";
import { center } from "../geometry";
import { box } from "./primitives";

export function spdtEl(x, y, c, glow) {
  const cx = center(x),
    cy = center(y);
  const V = {
    N: [cx, cy - 15],
    S: [cx, cy + 15],
    W: [cx - 15, cy],
    E: [cx + 15, cy],
  };
  const outs = spdtOuts(c),
    act = outs[c.pos ? 1 : 0];
  const col = glow ? LIVE : SWITCH_ON;
  return (
    <g key={`k${x},${y}`}>
      {box(cx, cy)}
      {[c.dir, outs[0], outs[1]].map((s) => (
        <circle key={s} cx={V[s][0]} cy={V[s][1]} r={3} fill={INK} />
      ))}
      {outs.map((s) => (
        <line
          key={s}
          x1={V[c.dir][0]}
          y1={V[c.dir][1]}
          x2={V[s][0] * 0.82 + cx * 0.18}
          y2={V[s][1] * 0.82 + cy * 0.18}
          stroke={s === act ? col : SWITCH_OFF}
          strokeWidth={s === act ? 5 : 2}
          opacity={s === act ? 1 : 0.45}
          strokeLinecap="round"
        />
      ))}
    </g>
  );
}
