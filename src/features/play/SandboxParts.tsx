import { RotateCw } from "lucide-react";
import type { Orient, ToolId } from "../../domain/types";
import { previewCell } from "../../engine/editing";
import { EMPTY_SIM } from "../../render/emptySim";
import { cellGlyph } from "../../render/symbols";
import { TOOLS, toolTileStyle } from "../../ui/tools";

interface Props {
  partTools: ToolId[];
  tool: ToolId;
  setTool: (t: ToolId) => void;
  orient: Orient;
  toggleOrient: () => void;
}

/* Bauteilauswahl im freien Baumodus: größere Kacheln unter dem Brett. */
export function SandboxParts({ partTools, tool, setTool, orient, toggleOrient }: Props) {
  if (!partTools.length) return null;
  return (
    <div className="mt-4">
      <h3 id="parts-heading" className="mb-2 text-sm font-semibold text-stone-600">
        Bauteile
      </h3>
      <div
        role="group"
        aria-labelledby="parts-heading"
        className="grid gap-2"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(128px, 1fr))" }}
      >
        {partTools.map((t) => {
          const active = tool === t;
          const preview = previewCell(t, active ? orient : "h");
          return (
            <button
              key={t}
              onClick={() => setTool(t)}
              aria-pressed={active}
              className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-xs font-medium transition ${toolTileStyle(active)}`}
            >
              <svg
                viewBox="0 0 60 60"
                width={48}
                height={48}
                aria-hidden="true"
                className="shrink-0"
              >
                {cellGlyph("0,0", preview, EMPTY_SIM)}
              </svg>
              <span className="w-full break-words text-center leading-snug">{TOOLS[t].label}</span>
            </button>
          );
        })}
      </div>
      {partTools.includes(tool) && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-stone-600">
          <span>{TOOLS[tool].label} setzen · Tippe auf das Feld</span>
          {tool !== "cross" && (
            <button
              onClick={toggleOrient}
              aria-label={`Ausrichtung: ${orient === "h" ? "Waagerecht" : "Senkrecht"}. Zum Drehen antippen.`}
              className="flex min-h-11 items-center gap-1.5 rounded-lg px-2 font-medium hover:bg-stone-100"
            >
              <RotateCw size={14} />
              {orient === "h" ? "Waagerecht ↔" : "Senkrecht ↕"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
