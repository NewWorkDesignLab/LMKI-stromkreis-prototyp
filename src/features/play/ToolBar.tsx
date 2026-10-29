import { Cable, Eraser, RotateCw } from "lucide-react";
import type { ReactNode } from "react";
import type { Orient, ToolId } from "../../domain/types";
import { PLACEABLE } from "../../engine/editing";
import { TOOLS } from "../../ui/tools";

interface Props {
  /** alle zulässigen Werkzeuge des Bauschritts */
  palette: ToolId[];
  tool: ToolId;
  setTool: (t: ToolId) => void;
  orient: Orient;
  toggleOrient: () => void;
}

const BUTTON =
  "flex min-h-11 min-w-11 items-center justify-center rounded-lg px-2.5 text-sm font-medium transition disabled:pointer-events-none disabled:opacity-35";
const modeButton = (active: boolean) =>
  `${BUTTON} ${active ? "bg-stone-800 text-white" : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"}`;

/* Das Kürzel steht sichtbar im Knopf, auch eingeklappt: wer es sieht, lernt es nebenbei. */
function Key({ children, active = false }: { children: ReactNode; active?: boolean }) {
  return (
    <kbd
      aria-hidden="true"
      className={`ml-1.5 rounded border px-1 text-xs leading-4 ${active ? "border-stone-500 text-stone-300" : "border-stone-300 text-stone-500"}`}
    >
      {children}
    </kbd>
  );
}

/* Beschriftung, die nur am gerade wichtigen Knopf ausgeklappt ist. Die Breite gleitet
   über eine Rasterspalte von 0fr auf 1fr – anders als width: auto lässt sich das
   animieren. Der Abstand zum Symbol sitzt innen, damit eingeklappt nichts übrig bleibt. */
function Label({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className={`grid transition-[grid-template-columns,opacity] duration-200 ease-out motion-reduce:transition-none ${open ? "grid-cols-[1fr] opacity-100" : "grid-cols-[0fr] opacity-0"}`}
    >
      <span className="min-w-0 overflow-hidden whitespace-nowrap">
        <span className="pl-1.5">{children}</span>
      </span>
    </span>
  );
}

/* Schwebende Werkzeugleiste oben links im Brettrahmen: Verdrahten, Löschen, Drehen – die
   drei Bedienungen mit Tastenkürzel (useBoardEditor), direkt am Brett statt in der
   Seitenspalte. Ausgeschrieben ist nur das aktive Werkzeug; ist ein drehbares Bauteil
   gewählt, ist es Drehen. Die Kreuzung hat keine Ausrichtung, sie zählt dafür nicht. */
export function ToolBar({ palette, tool, setTool, orient, toggleOrient }: Props) {
  const rotatable = (t: ToolId) => PLACEABLE.has(t) && t !== "cross";
  const canRotate = palette.some(rotatable);
  const wire = tool === "wire",
    erase = tool === "erase",
    rotating = rotatable(tool);

  return (
    <div
      role="group"
      aria-label="Werkzeug"
      className="flex items-center gap-0.5 rounded-xl border border-stone-200 bg-white/95 p-0.5 shadow-sm"
    >
      <button
        type="button"
        onClick={() => setTool("wire")}
        aria-pressed={wire}
        aria-label="Verdrahten (Taste W oder Esc)"
        title="Verdrahten (Taste W oder Esc)"
        className={modeButton(wire)}
      >
        <Cable size={18} aria-hidden="true" />
        <Label open={wire}>Verdrahten</Label>
        <Key active={wire}>W</Key>
      </button>
      {palette.includes("erase") && (
        <button
          type="button"
          onClick={() => setTool("erase")}
          aria-pressed={erase}
          aria-label={`${TOOLS.erase.label} (Taste E)`}
          title="Löschen (Taste E; Rechtsklick löscht mit jedem Werkzeug)"
          className={modeButton(erase)}
        >
          <Eraser size={18} aria-hidden="true" />
          <Label open={erase}>{TOOLS.erase.label}</Label>
          <Key active={erase}>E</Key>
        </button>
      )}
      {canRotate && (
        <button
          type="button"
          onClick={toggleOrient}
          disabled={!rotating}
          aria-label={`Ausrichtung: ${orient === "h" ? "waagerecht" : "senkrecht"}. Drehen (Taste R)`}
          title="Gewähltes Bauteil drehen (Taste R)"
          className={modeButton(rotating)}
        >
          <RotateCw size={16} aria-hidden="true" />
          <Label open={rotating}>Drehen</Label>
          <Key active={rotating}>R</Key>
        </button>
      )}
    </div>
  );
}
