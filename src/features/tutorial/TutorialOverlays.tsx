import { TUT } from "../../theme/colors";
import { center } from "../../render/geometry";

/* Anzeigen der Einführungen (Daten: content/tutorials.ts). Reine Darstellung:
   sie lesen das Feld, setzen nichts und nehmen keine Zeiger an. */
const tutPath = (pts: [number, number][]) =>
  pts.map(([x, y], i) => `${i ? "L" : "M"} ${center(x)} ${center(y)}`).join(" ");
export function TutorialClick({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${center(x)} ${center(y)})`} pointerEvents="none" aria-hidden="true">
      <circle r={15} fill="none" stroke={TUT} strokeWidth={2} strokeDasharray="2 5" opacity={0.6} />
      <g className="tutorial-demo">
        <circle className="tutorial-click-ring" r={12} fill="none" stroke={TUT} strokeWidth={2} />
        <g transform="translate(12 12)">
          <g className="tutorial-click-cursor">
            <path
              d="M 0 0 L 7 22 L 11 15 L 21 25 L 25 21 L 15 11 L 22 7 Z"
              fill="white"
              stroke="#087e8b"
              strokeWidth={1.4}
            />
          </g>
        </g>
      </g>
    </g>
  );
}
// A self-contained CSS timeline: remounting a step restarts only its demonstration.
export function TutorialRoute({
  step,
  moving,
}: {
  step: { path: [number, number][] };
  moving?: boolean;
}) {
  const d = tutPath(step.path);
  const [x, y] = step.path[0];
  return (
    <g pointerEvents="none" aria-hidden="true">
      <path d={d} fill="none" stroke={TUT} strokeWidth={3} strokeDasharray="2 7" opacity={0.4} />
      <circle cx={center(x)} cy={center(y)} r={9} fill="white" stroke={TUT} strokeWidth={2} />
      {moving && (
        <g className="tutorial-demo">
          <path
            className="tutorial-trace"
            d={d}
            pathLength={1}
            fill="none"
            stroke={TUT}
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <g
            className="tutorial-cursor"
            style={{ offsetPath: `path("${d}")`, offsetRotate: "0deg" }}
          >
            <circle r={12} fill={TUT} opacity={0.18} />
            <circle r={5} fill={TUT} stroke="white" strokeWidth={2} />
            <path
              d="M 3 3 L 3 20 L 7 16 L 11 23 L 15 21 L 11 14 L 17 14 Z"
              fill="white"
              stroke="#087e8b"
              strokeWidth={1.4}
            />
          </g>
        </g>
      )}
    </g>
  );
}
