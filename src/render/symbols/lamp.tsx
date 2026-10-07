import { LAMP_ON, LAMP_STROKE, FORBID, HOT } from "../../theme/colors";
import { center } from "../geometry";
import { ports } from "./primitives";

export function lampEl(x, y, c, on, bright, over) {
  const cx = center(x),
    cy = center(y),
    forbid = c.goal === "off";
  const b = Math.max(0, Math.min(1, bright || 0));
  // Niedrige Leistungen deutlicher spreizen: bei 100 / 220 Ohm etwa 65 / 38 %.
  // Nur die Darstellung anpassen; Leistung und Leuchtschwelle bleiben physikalisch berechnet.
  const light = on ? (1.18 * b) / (b + 0.18) : 0;
  const lightColor = over ? HOT : LAMP_ON;
  // Beim Dimmen wird die warme Farbe transparenter; der Schein wird enger.
  const spread = Math.pow(light, 1.35);
  const bulbOpacity = on && !over ? 0.5 + 0.5 * light : 1;
  const bulbColor = !on
    ? "#fff"
    : over
      ? HOT
      : `rgb(255, ${Math.round(148 + 46 * light)}, ${Math.round(20 + 40 * light)})`;
  return (
    <g key={`l${x},${y}`}>
      {on && (
        <g fill={lightColor} pointerEvents="none">
          <circle cx={cx} cy={cy} r={16 + 12 * spread} opacity={0.24 + 0.06 * light} />
          <circle cx={cx} cy={cy} r={16 + 6 * spread} opacity={0.29 + 0.06 * light} />
        </g>
      )}
      <circle cx={cx} cy={cy} r={15} fill="#fff" />
      <circle
        cx={cx}
        cy={cy}
        r={15}
        fill={bulbColor}
        fillOpacity={bulbOpacity}
        stroke={over ? HOT : forbid ? FORBID : LAMP_STROKE}
        strokeWidth={forbid || over ? 2.5 : 2}
        strokeDasharray={forbid ? "4 3" : "none"}
      />
      <path
        d={`M ${cx - 5} ${cy + 4} Q ${cx} ${cy - 8} ${cx + 5} ${cy + 4}`}
        fill="none"
        stroke={on ? "#a9710a" : "#b9b3a4"}
        strokeWidth={2}
        strokeLinecap="round"
      />
      {on &&
        [0, 1, 2, 3, 4, 5].map((i) => {
          const a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
          return (
            <line
              key={i}
              x1={cx + Math.cos(a) * 18}
              y1={cy + Math.sin(a) * 18}
              x2={cx + Math.cos(a) * (18 + 10 * spread)}
              y2={cy + Math.sin(a) * (18 + 10 * spread)}
              stroke={lightColor}
              strokeWidth={3}
              strokeLinecap="round"
            />
          );
        })}
      {ports(cx, cy, c, over ? HOT : forbid ? FORBID : LAMP_STROKE)}
    </g>
  );
}

/* LED: Dreieck zeigt in Durchlassrichtung, Balken ist die Kathode */
