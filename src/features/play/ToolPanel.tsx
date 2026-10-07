import { Cable, Eraser, RotateCw } from "lucide-react";
import type { Orient, ToolId } from "../../domain/types";
import { previewCell } from "../../engine/editing";
import { EMPTY_SIM } from "../../render/emptySim";
import { cellGlyph } from "../../render/symbols";
import { TOOLS, toolTileStyle } from "../../ui/tools";

interface Props {
  /** alle zulässigen Werkzeuge des Levels */
  palette: ToolId[];
  /** davon die setzbaren Bauteile */
  partTools: ToolId[];
  tool: ToolId;
  setTool: (t: ToolId) => void;
  orient: Orient;
  toggleOrient: () => void;
  showParts: boolean;
}

const segment = (active: boolean) =>
  `flex-1 flex flex-col items-center justify-center gap-1 px-2 rounded-lg font-medium transition ${active ? "bg-white shadow text-stone-900" : "text-stone-500 hover:text-stone-700"}`;

/* Werkzeug und Bauteile bilden unter der Aufgabe einen Bereich aus zwei
   Spalten, jede mit ihrer Überschrift darüber. Beide zeigen dieselbe
   Kachelform, denn tool ist EINE Auswahl: die aktive Markierung wandert
   zwischen den Spalten. Der Drehen-Knopf erscheint erst, wenn ein
   Bauteil gewählt ist – ohne Auswahl gibt es nichts zu drehen.
   `showParts` ist im Level an; im Frei bauen stehen die Bauteile separat (SandboxParts). */
export function ToolPanel({
  palette,
  partTools,
  tool,
  setTool,
  orient,
  toggleOrient,
  showParts,
}: Props) {
  return (
    <div className="mb-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
      {/* Die beiden Modi bleiben ein Segment-Umschalter im grauen Trog: sie
          schließen einander aus, anders als die Bauteil-Kacheln daneben.
          Etwa halbe Spaltenbreite, damit die Trennung zu den Bauteilen
          deutlich bleibt – auch in Leveln ganz ohne Bauteile. */}
      <div className="w-full min-w-[14rem] max-w-[19rem] flex-1">
        <h3
          id="tools-heading"
          className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-400"
        >
          Werkzeug
        </h3>
        {/* 72 px wie eine Bauteil-Kachel, damit beide Spalten auf derselben
            Linie enden. Bei der Höhe steht das Symbol über der Schrift wie
            in den Kacheln – nebeneinander bliebe die Fläche leer. */}
        <div
          role="group"
          aria-labelledby="tools-heading"
          className="flex h-[72px] gap-1 rounded-xl bg-stone-200 p-1 text-xs"
        >
          <button
            onClick={() => setTool("wire")}
            aria-pressed={tool === "wire"}
            className={segment(tool === "wire")}
          >
            <Cable size={22} />
            Leitung ziehen
          </button>
          {palette.includes("erase") && (
            <button
              onClick={() => setTool("erase")}
              aria-pressed={tool === "erase"}
              className={segment(tool === "erase")}
            >
              <Eraser size={22} />
              {TOOLS.erase.label}
            </button>
          )}
        </div>
      </div>

      {showParts && partTools.length > 0 && (
        <div>
          <div className="mb-1 flex items-center gap-2">
            <h3
              id="level-parts-heading"
              className="text-xs font-semibold uppercase tracking-wide text-stone-400"
            >
              Bauteile
            </h3>
            {partTools.includes(tool) && tool !== "cross" && (
              <button
                onClick={toggleOrient}
                aria-label={`Ausrichtung: ${orient === "h" ? "Waagerecht" : "Senkrecht"}. Zum Drehen antippen.`}
                title={orient === "h" ? "Waagerecht – drehen" : "Senkrecht – drehen"}
                className="flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-xs font-medium text-stone-600 hover:bg-stone-100"
              >
                <RotateCw size={13} />
                <span aria-hidden="true">{orient === "h" ? "↔" : "↕"}</span>
              </button>
            )}
          </div>
          <div
            role="group"
            aria-labelledby="level-parts-heading"
            className="flex max-w-[15.75rem] flex-wrap gap-1.5"
          >
            {partTools.map((t) => {
              const active = tool === t;
              const preview = previewCell(t, active ? orient : "h");
              return (
                <button
                  key={t}
                  onClick={() => setTool(t)}
                  aria-pressed={active}
                  className={`flex h-[72px] w-20 flex-col items-center justify-center gap-0.5 rounded-xl border px-1 py-0.5 text-[10px] font-medium transition ${toolTileStyle(active)}`}
                >
                  <svg
                    viewBox="0 0 60 60"
                    width={36}
                    height={36}
                    aria-hidden="true"
                    className="shrink-0"
                  >
                    {cellGlyph("0,0", preview, EMPTY_SIM)}
                  </svg>
                  <span className="w-full break-words text-center leading-tight">
                    {TOOLS[t].label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
