import { Cable, Eraser, RotateCw } from "lucide-react";
import { useState } from "react";
import type { Orient, ToolId } from "../../domain/types";
import { PLACEABLE, newPart } from "../../engine/editing";
import { EMPTY_SIM } from "../../render/emptySim";
import { partGlyph } from "../../render/symbols";
import { PANEL_HEADING as HEADING } from "../../ui/heading";
import { GROUPS, GROUP_ORDER, TOOLS } from "../../ui/tools";

interface Props {
  /** alle zulässigen Werkzeuge des Bauschritts */
  palette: ToolId[];
  tool: ToolId;
  setTool: (t: ToolId) => void;
  /** Materialvorrat: noch setzbare Teile je Werkzeug, null = unbegrenzt */
  left: (t: ToolId) => number | null;
  orient: Orient;
  toggleOrient: () => void;
}

const modeButton = (active: boolean) =>
  `flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-medium transition ${active ? "bg-white text-stone-900 shadow" : "text-stone-500 hover:text-stone-800"}`;

/* Linke Spalte: Werkzeug und Bauteile. tool ist EINE Auswahl – die Markierung wandert
   zwischen Verdrahten/Löschen und den Bauteilen. Die Bauteile stehen nach Gruppen und
   farbig, damit man sie findet, ohne die Symbole schon zu kennen. Zwei Kacheln je Zeile,
   damit auch die volle Palette des freien Baumodus ohne Scrollen passt; die Kurzinfo
   steht darunter für das überfahrene bzw. gewählte Bauteil. */
export function PartPalette({ palette, tool, setTool, orient, toggleOrient, left }: Props) {
  const [hovered, setHovered] = useState<ToolId | null>(null);
  const parts = palette.filter((t) => PLACEABLE.has(t));
  const groups = GROUP_ORDER.map((g) => ({
    g,
    tools: parts.filter((t) => TOOLS[t].group === g),
  })).filter((x) => x.tools.length);
  const placing = PLACEABLE.has(tool);
  const shown = hovered ?? (placing ? tool : null);

  return (
    <div className="flex flex-col gap-3">
      <section aria-labelledby="tool-heading">
        <h2 id="tool-heading" className={HEADING}>
          Werkzeug
        </h2>
        <div className="flex gap-1 rounded-xl bg-stone-200 p-1">
          <button
            type="button"
            onClick={() => setTool("wire")}
            aria-pressed={tool === "wire"}
            title="Verdrahten (Taste W oder Esc)"
            className={modeButton(tool === "wire")}
          >
            <Cable size={18} aria-hidden="true" /> Verdrahten
          </button>
          {palette.includes("erase") && (
            <button
              type="button"
              onClick={() => setTool("erase")}
              aria-pressed={tool === "erase"}
              title="Löschen (Taste E; Rechtsklick löscht mit jedem Werkzeug)"
              className={modeButton(tool === "erase")}
            >
              <Eraser size={18} aria-hidden="true" /> {TOOLS.erase.label}
            </button>
          )}
        </div>
      </section>

      {groups.map(({ g, tools }) => (
        <section key={g} aria-labelledby={`group-${g}`}>
          <h2 id={`group-${g}`} className={`${HEADING} flex items-center gap-1.5`}>
            <span aria-hidden="true" className={`h-2 w-2 rounded-full ${GROUPS[g].dot}`} />
            {GROUPS[g].label}
          </h2>
          <div className="grid grid-cols-2 gap-1.5">
            {tools.map((t) => {
              const active = tool === t;
              const preview = newPart(t, 0, 0, active ? orient : "h");
              const n = left(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTool(active ? "wire" : t)}
                  onPointerEnter={() => setHovered(t)}
                  onPointerLeave={() => setHovered(null)}
                  onFocus={() => setHovered(t)}
                  onBlur={() => setHovered(null)}
                  aria-pressed={active}
                  aria-label={n === null ? undefined : `${TOOLS[t].label}, noch ${n} verfügbar`}
                  title={TOOLS[t].info}
                  className={`relative flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-xl border px-1 py-1 transition ${GROUPS[g].tile} ${active ? GROUPS[g].active : ""} ${n === 0 ? "opacity-45" : ""}`}
                >
                  {/* Vorrat: wie viele davon man noch setzen darf */}
                  {n !== null && (
                    <span
                      aria-hidden="true"
                      className="absolute right-1 top-1 rounded-md bg-white/90 px-1 text-[0.7rem] font-bold tabular-nums leading-4 text-stone-700 ring-1 ring-stone-200"
                    >
                      {n}×
                    </span>
                  )}
                  <svg viewBox="0 0 60 60" width={38} height={38} aria-hidden="true">
                    {partGlyph("vorschau", preview, EMPTY_SIM)}
                  </svg>
                  <span className="text-center text-xs font-semibold leading-tight">
                    {TOOLS[t].label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {shown && (
        <div className="rounded-xl border border-stone-200 bg-white px-3 py-2" aria-live="polite">
          <p className="text-sm font-semibold text-stone-800">{TOOLS[shown].label}</p>
          <p className="text-xs leading-snug text-stone-600">{TOOLS[shown].info}</p>
          {placing && shown === tool && tool !== "cross" && (
            <button
              type="button"
              onClick={toggleOrient}
              aria-label={`Ausrichtung: ${orient === "h" ? "waagerecht" : "senkrecht"}. Drehen (Taste R)`}
              className="mt-1.5 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-stone-300 px-3 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              <RotateCw size={16} aria-hidden="true" />
              {orient === "h" ? "Waagerecht ↔" : "Senkrecht ↕"}
              <kbd className="rounded border border-stone-300 px-1 text-xs text-stone-500">R</kbd>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
