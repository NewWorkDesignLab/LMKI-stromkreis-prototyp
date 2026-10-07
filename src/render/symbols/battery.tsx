import { LIVE, BATT_PLUS, INK, HOT } from "../../theme/colors";
import { center } from "../geometry";
import { box } from "./primitives";
import { ports } from "./primitives";

export function batteryEl(x, y, c, active, hot) {
  const cx = center(x),
    cy = center(y),
    v = c.orient === "v";
  const rev = !!c.rev;
  return (
    <g key={`b${x},${y}`}>
      {active && (
        <circle
          cx={cx}
          cy={cy}
          r={24}
          fill="none"
          stroke={hot ? HOT : LIVE}
          strokeWidth={3}
          opacity={0.6}
        />
      )}
      {box(cx, cy)}
      {v ? (
        <>
          <line x1={cx - 12} y1={cy} x2={cx + 12} y2={cy} stroke="#d9d3c4" strokeWidth={1.5} />
          <text
            x={cx}
            y={cy - 3}
            textAnchor="middle"
            fontSize={15}
            fontWeight="700"
            fill={rev ? INK : BATT_PLUS}
          >
            {rev ? "−" : "+"}
          </text>
          <text
            x={cx}
            y={cy + 14}
            textAnchor="middle"
            fontSize={15}
            fontWeight="700"
            fill={rev ? BATT_PLUS : INK}
          >
            {rev ? "+" : "−"}
          </text>
        </>
      ) : (
        <>
          <line x1={cx} y1={cy - 12} x2={cx} y2={cy + 12} stroke="#d9d3c4" strokeWidth={1.5} />
          <text
            x={cx + 9}
            y={cy + 5}
            textAnchor="middle"
            fontSize={15}
            fontWeight="700"
            fill={rev ? INK : BATT_PLUS}
          >
            {rev ? "−" : "+"}
          </text>
          <text
            x={cx - 9}
            y={cy + 5}
            textAnchor="middle"
            fontSize={15}
            fontWeight="700"
            fill={rev ? BATT_PLUS : INK}
          >
            {rev ? "+" : "−"}
          </text>
        </>
      )}
      {ports(cx, cy, c, INK, 17)}
    </g>
  );
}

/* Schalter. `nc` macht daraus einen Öffner (Ruhekontakt) und ändert nur das
   Symbol: `closed` heißt überall „leitet“, ein Öffner startet deshalb mit
   closed: true. Der Querstrich am festen Anschluss – der Kontakt, gegen den der
   Hebel drückt – ist die Unterscheidung zum Schließer. */
