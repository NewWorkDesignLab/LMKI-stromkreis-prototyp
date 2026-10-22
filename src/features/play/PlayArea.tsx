import type { BuildStep } from "../../domain/types";
import { PLACEABLE, type PlayMode } from "../../engine/editing";
import { Board } from "../../render/Board";
import { ContactLab } from "../widgets/ContactLab";
import { useTutorial } from "../tutorial/useTutorial";
import { SandboxParts } from "./SandboxParts";
import { StatusPanel } from "./StatusPanel";
import { TaskCard } from "./TaskCard";
import { ToolPanel } from "./ToolPanel";
import { WinPanel } from "./WinPanel";
import { usePlaySession } from "./usePlaySession";

interface Props {
  step: BuildStep;
  mode: PlayMode;
  /** Sichtbar und bedienbar; sonst greifen auch Tastenkürzel nicht */
  active?: boolean;
  /** Ein Dialog liegt über dem Spiel: Einführungsanimationen pausieren */
  overlayOpen: boolean;
  onSolved?: () => void;
  onReset?: () => void;
  /** Knopf nach dem Lösen */
  proceed?: { label: string; onClick: () => void };
}

/* Ein Bauschritt: Aufgabe, Werkzeuge, Brett, Zusatzbausteine, Status. Gilt für genau
   einen Schritt – der Aufrufer hängt es je Schritt mit eigenem key ein. */
export function PlayArea({
  step,
  mode,
  active = true,
  overlayOpen,
  onSolved,
  onReset,
  proceed,
}: Props) {
  const s = usePlaySession(step, mode, active, { onSolved, onReset });
  const toggleOrient = () => s.setOrient((o) => (o === "h" ? "v" : "h"));

  const palette = step.palette;
  const partTools = palette.filter((t) => PLACEABLE.has(t));

  const tutorial = useTutorial({
    level: step,
    circuit: s.circuit,
    won: s.won,
    suppressed: !active || mode !== "level" || s.tool !== "wire" || overlayOpen || s.isDrawing,
  });

  return (
    <>
      <TaskCard level={step} mode={mode} />

      <ToolPanel
        palette={palette}
        partTools={partTools}
        tool={s.tool}
        setTool={s.setTool}
        orient={s.orient}
        toggleOrient={toggleOrient}
        showParts={mode === "level"}
      />

      <Board
        level={step}
        circuit={s.circuit}
        sim={s.sim}
        tool={s.tool}
        svgRef={s.svgRef}
        handlers={s.handlers}
        hint={s.hint}
        overlay={tutorial}
      />

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

      {mode === "sandbox" && (
        <SandboxParts
          partTools={partTools}
          tool={s.tool}
          setTool={s.setTool}
          orient={s.orient}
          toggleOrient={toggleOrient}
        />
      )}

      <StatusPanel
        mode={mode}
        sim={s.sim}
        check={s.check}
        onReset={s.reset}
        onClear={s.clear}
        onUndo={s.undo}
        onRedo={s.redo}
        canUndo={s.canUndo}
        canRedo={s.canRedo}
      />

      {mode === "level" && s.won && proceed && <WinPanel proceed={proceed} />}
    </>
  );
}
