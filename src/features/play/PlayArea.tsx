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
import { PartDrawer } from "./PartDrawer";
import { hasParts } from "./PartPalette";
import { GoalList, StatusBar, TaskBar, WinPanel } from "./BuildPanels";
import { ToolBar } from "./ToolBar";
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

/* Ein Bauschritt: eine Spalte aus Aufgabe, Brett (mit Werkzeugleiste oben links) und
   Zustand – in Leserichtung untereinander, so breit wie das Brett. Ab xl stehen das
   aufklappbare Bauteilfach links und die Ziele rechts neben dieser Spalte, darunter vor
   und nach dem Brett (die eigentliche Mobilansicht kommt später).
   Im Level richtet sich das Brett nach seiner Größe; im freien Bauen füllt es die Fläche.
   Gilt für genau einen Schritt – der Aufrufer hängt es je Schritt mit eigenem key ein. */
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
    <div className="flex min-h-0 flex-col lg:h-full">
      {/* Reicht die Höhe nicht, schrumpft zuerst der Brettrahmen (bis zu seiner
          Mindesthöhe); steht ein Zusatzbaustein darunter, scrollt die Spalte. Der seitliche
          Rand ab xl hält Platz für Bauteilfach links und Ziele rechts, die neben der
          Brettspalte stehen. */}
      <div className="flex min-h-0 flex-1 flex-col lg:overflow-y-auto xl:px-[18.5rem]">
        <div
          /* p-1: Luft für die herausgehobene Aufgabe (Schatten), sonst schnitte die
             scrollende Spalte ihren Rand ab */
          className={`relative mx-auto flex min-h-0 w-full flex-col gap-3 p-1 ${fill ? "flex-1" : ""}`}
          style={fill ? undefined : { maxWidth: columnWidth }}
        >
          <TaskBar step={step} mode={mode} style={intro.taskStyle} intro={intro.intro} />
          <div className={`relative flex min-h-0 flex-col gap-3 ${fill ? "flex-1" : ""}`}>
            {hasParts(step.palette) && (
              <PartDrawer
                palette={step.palette}
                tool={s.tool}
                setTool={s.setTool}
                left={s.left}
                orient={s.orient}
              />
            )}
            <BoardViewport
              content={extent}
              fill={fill}
              solved={mode === "level" && s.won}
              toolbar={
                <ToolBar
                  palette={step.palette}
                  tool={s.tool}
                  setTool={s.setTool}
                  orient={s.orient}
                  toggleOrient={() => s.setOrient((o) => (o === "h" ? "v" : "h"))}
                />
              }
            >
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
          </div>
          <StatusBar sim={s.sim} mode={mode} tools={tools} />
          <GoalList
            check={s.check}
            readings={s.readings}
            onReading={s.setReading}
            intro={intro.intro}
            goalsEnter={intro.goalsEnter}
          />
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
    </div>
  );
}
