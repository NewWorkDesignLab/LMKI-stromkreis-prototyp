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
        {/* Die beiden Lichtpfeile gehören zum Schaltzeichen der LED, nicht zum Zustand –
            ohne sie wäre es eine gewöhnliche Diode. Leuchten färbt sie nur ein. Sie stehen
            neben dem Dreieck und zeigen schräg in Durchlassrichtung vom Bauteil weg (in
            diesem Rahmen fließt der Strom nach unten); zum Bauteil hin hieße Fotodiode.
            Quer zur Pfeilrichtung liegen sie 7 auseinander (Versatz 5,−5), sonst
            verschmelzen sie in Brettgröße zu einem Pfeil mit Doppelspitze. */}
        {[
          [9, -1],
          [14, -6],
        ].map(([ax, ay]) => (
          <path
            key={ay}
            d={`M ${cx + ax} ${cy + ay} l 6 6 m -4 0 l 4 0 l 0 -4`}
            fill="none"
            stroke={over ? HOT : on ? LAMP_ON : INK}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </g>
    </g>
  );
}
