import { Redo2, RotateCcw, Trash2, Undo2 } from "lucide-react";
import type { BuildStep, Circuit } from "../../domain/types";
import type { PlayMode } from "../../engine/editing";
import { useRuntimeState } from "../../app/RuntimeContext";
import { Board } from "../../render/Board";
import { boardExtent } from "../../render/geometry";
import { FRAME_PAD, NATURAL_SCALE } from "../../render/viewport";
import { ContactLab } from "../widgets/ContactLab";
import { useTutorial } from "../tutorial/useTutorial";
import { BoardViewport, TOOL_BUTTON } from "./BoardViewport";
import { PartPalette } from "./PartPalette";
import { StatusBar, TaskBar, WinPanel } from "./BuildPanels";
import { usePlaySession } from "./usePlaySession";
import { useTaskIntro } from "./useTaskIntro";

interface Props {
  step: BuildStep;
  mode: PlayMode;
  /** Sichtbar und bedienbar; sonst greifen auch Tastenkürzel nicht */
  active?: boolean;
  /** Ein Dialog liegt über dem Spiel: Einführungsanimationen pausieren */
  overlayOpen: boolean;
  onSolved?: (circuit: Circuit) => void;
  onReset?: () => void;
  /** Knopf nach dem Lösen */
  proceed?: { label: string; onClick: () => void };
  /** Merksatz, der nach dem Lösen anklingt */
  teaser?: string;
}

/* Die Mittelspalte ist so breit wie das Brett, aber nie schmaler als eine gut lesbare
   Aufgabenzeile (40 rem) – sonst bräche der Aufgabentext bei kleinen Brettern in viele
   kurze Zeilen. */
const MIN_COLUMN_PX = 640;

/* Ein Bauschritt: links Werkzeug und Bauteile, in der Mitte eine Spalte aus Aufgabe mit
   Zielen, Brett und Zustand – in Leserichtung untereinander, so breit wie das Brett.
   Im Level richtet sich das Brett nach seiner Größe; im freien Bauen füllt es die Fläche.
   Ab xl hält eine leere Gegenspalte die Mittelspalte in der Fenstermitte, unter lg steht
   alles untereinander (die eigentliche Mobilansicht kommt später). Gilt für genau einen
   Schritt – der Aufrufer hängt es je Schritt mit eigenem key ein. */
export function PlayArea({
  step,
  mode,
  active = true,
  overlayOpen,
  onSolved,
  onReset,
  proceed,
  teaser,
}: Props) {
  const { settings } = useRuntimeState();
  const s = usePlaySession(step, mode, active, {
    onSolved,
    onReset,
    snapWires: settings.snapWires,
  });

  const intro = useTaskIntro(settings.taskIntro && mode === "level", active);

  const tutorial = useTutorial({
    level: step,
    circuit: s.circuit,
    won: s.won,
    suppressed:
      !active || mode !== "level" || s.tool !== "wire" || overlayOpen || s.isDrawing || intro.intro,
  });

  const tools = (
    <>
      <button
        type="button"
        onClick={s.undo}
        disabled={!s.canUndo}
        aria-label="Rückgängig (Strg+Z)"
        title="Rückgängig (Strg+Z)"
        className={TOOL_BUTTON}
      >
        <Undo2 size={17} />
      </button>
      <button
        type="button"
        onClick={s.redo}
        disabled={!s.canRedo}
        aria-label="Wiederholen (Strg+Y)"
        title="Wiederholen (Strg+Y)"
        className={TOOL_BUTTON}
      >
        <Redo2 size={17} />
      </button>
      <button type="button" onClick={s.reset} className={TOOL_BUTTON}>
        <RotateCcw size={16} aria-hidden="true" /> Zurücksetzen
      </button>
      {mode === "sandbox" && (
        <button
          type="button"
          onClick={s.clear}
          className={`${TOOL_BUTTON} text-red-600 hover:bg-red-50 hover:text-red-700`}
        >
          <Trash2 size={16} aria-hidden="true" /> Leeren
        </button>
      )}
    </>
  );

  const fill = mode === "sandbox";
  const extent = boardExtent(step.W, step.H);
  const columnWidth = Math.max(MIN_COLUMN_PX, extent.w * NATURAL_SCALE + 2 * FRAME_PAD);

  return (
    <div className="grid gap-3 lg:h-full lg:min-h-0 lg:grid-cols-[15.5rem_minmax(0,1fr)] xl:grid-cols-[15.5rem_minmax(0,1fr)_15.5rem]">
      <aside aria-label="Werkzeug und Bauteile" className="lg:min-h-0 lg:overflow-y-auto lg:pr-1">
        <PartPalette
          palette={step.palette}
          tool={s.tool}
          setTool={s.setTool}
          left={s.left}
          orient={s.orient}
          toggleOrient={() => s.setOrient((o) => (o === "h" ? "v" : "h"))}
        />
      </aside>

      {/* Reicht die Höhe nicht, schrumpft zuerst der Brettrahmen (bis zu seiner
          Mindesthöhe); steht ein Zusatzbaustein darunter, scrollt die Spalte. */}
      <div className="flex min-h-0 flex-col lg:overflow-y-auto">
        <div
          /* p-1: Luft für die herausgehobene Aufgabe (Schatten), sonst schnitte die
             scrollende Spalte ihren Rand ab */
          className={`mx-auto flex min-h-0 w-full flex-col gap-3 p-1 ${fill ? "flex-1" : ""}`}
          style={fill ? undefined : { maxWidth: columnWidth }}
        >
          <TaskBar
            step={step}
            mode={mode}
            check={s.check}
            style={intro.taskStyle}
            intro={intro.intro}
            goalsEnter={intro.goalsEnter}
          />
          <BoardViewport content={extent} fill={fill} solved={mode === "level" && s.won}>
            {({ width, height }) => (
              <Board
                level={step}
                circuit={s.circuit}
                sim={s.sim}
                tool={s.tool}
                svgRef={s.svgRef}
                handlers={s.handlers}
                hint={s.hint}
                overlay={tutorial}
                width={width}
                height={height}
                flow={settings.flowAnimation}
              />
            )}
          </BoardViewport>
          <StatusBar sim={s.sim} mode={mode} tools={tools} />
          {mode === "level" && s.won && proceed && <WinPanel proceed={proceed} teaser={teaser} />}
          {step.contactLab && (
            <ContactLab
              config={step.contactLab}
              circuit={s.circuit}
              sim={s.sim}
              wired={s.check.won}
              lab={s.contactLab.lab}
              done={s.contactLab.done}
              press={s.press}
              release={s.release}
            />
          )}
        </div>
      </div>

      <div aria-hidden="true" className="hidden xl:block" />
    </div>
  );
}
