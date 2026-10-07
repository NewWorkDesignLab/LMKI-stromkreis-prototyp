import { LEGEND } from "../content/legend";
import { EMPTY_SIM } from "../render/emptySim";
import { cellGlyph } from "../render/symbols";
import { BG, WIRE } from "../theme/colors";

export function LegendOverlay() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {LEGEND.map(([c, name, desc], i) => (
        <div key={i} className="flex items-center gap-2 p-2 rounded-xl bg-stone-50">
          <svg
            viewBox="0 0 60 60"
            width={52}
            height={52}
            className="shrink-0"
            style={{ background: BG, borderRadius: 10 }}
          >
            <line
              x1={0}
              y1={30}
              x2={60}
              y2={30}
              stroke={WIRE}
              strokeWidth={6}
              strokeLinecap="round"
            />
            {cellGlyph("0,0", c, EMPTY_SIM)}
          </svg>
          <div className="min-w-0">
            <div className="text-sm font-semibold">{name}</div>
            <div className="text-xs text-stone-500 leading-snug">{desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
