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
  /** Ausrichtung für die Vorschau der gewählten Kachel; gedreht wird in der ToolBar */
  orient: Orient;
}

/* Die Bauteile (im aufklappbaren PartDrawer). tool ist EINE Auswahl – die Markierung wandert
   zwischen Verdrahten/Löschen (ToolBar am Brett) und den Bauteilen. Die Bauteile stehen nach
   Gruppen und farbig, damit man sie findet, ohne die Symbole schon zu kennen; die Kurzinfo
   steht darunter für das überfahrene bzw. gewählte Bauteil. */
/** Ob die Palette überhaupt Bauteile enthält (Verdrahten und Löschen liegen in der ToolBar). */
export const hasParts = (palette: ToolId[]) => palette.some((t) => PLACEABLE.has(t));

export function PartPalette({ palette, tool, setTool, orient, left }: Props) {
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
      {groups.map(({ g, tools }) => (
        <section key={g} aria-labelledby={`group-${g}`}>
          <h2 id={`group-${g}`} className={`${HEADING} flex items-center gap-1.5`}>
            <span aria-hidden="true" className={`h-3.5 w-1 rounded-full ${GROUPS[g].dot}`} />
            {GROUPS[g].label}
          </h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-2">
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
                  /* Eine Karte wie ein Bauteil aus dem Lagerkasten: Symbol auf getöntem Grund,
                     darunter das Etikett. Die Gruppenfarbe tönt nur den Grund. */
                  className={`relative flex min-h-24 flex-col overflow-hidden rounded-xl border shadow-sm transition hover:-translate-y-px hover:shadow-md ${GROUPS[g].tile} ${active ? GROUPS[g].active : ""} ${n === 0 ? "opacity-50" : ""}`}
                >
                  {/* Vorrat: wie viele davon man noch setzen darf */}
                  {n !== null && (
                    <span
                      aria-hidden="true"
                      className={`absolute right-1.5 top-1.5 rounded-full px-1.5 text-xs font-bold tabular-nums leading-5 text-white ${n === 0 ? "bg-stone-400" : GROUPS[g].dot}`}
                    >
                      {n}×
                    </span>
                  )}
                  <span className="flex flex-1 items-center justify-center px-1 pt-2">
                    <svg viewBox="0 0 60 60" width={46} height={46} aria-hidden="true">
                      {partGlyph("vorschau", preview, EMPTY_SIM)}
                    </svg>
                  </span>
                  <span className="border-t border-stone-200/80 bg-white px-1 py-1 text-center text-xs font-semibold leading-tight">
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
        </div>
      )}
    </div>
  );
}
