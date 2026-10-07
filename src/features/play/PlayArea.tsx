import type { LevelDef } from "../../domain/types";
import { PLACEABLE, type PlayMode } from "../../engine/editing";
import { Board } from "../../render/Board";
import { ContactLab } from "../widgets/ContactLab";
import { OhmLab } from "../widgets/OhmLab";
import { useTutorial } from "../tutorial/useTutorial";
import { SandboxParts } from "./SandboxParts";
import { StatusPanel } from "./StatusPanel";
import { TaskCard } from "./TaskCard";
import { ToolPanel } from "./ToolPanel";
import { WinPanel } from "./WinPanel";
import { usePlaySession } from "./usePlaySession";

interface Props {
  level: LevelDef;
  mode: PlayMode;
  /** Ein Dialog liegt über dem Spiel: Einführungsanimationen pausieren */
  overlayOpen: boolean;
  hasNext: boolean;
  onNext: () => void;
  onSolved: () => void;
  onReset: () => void;
}

/* Alles unter dem Leveltitel: Aufgabe, Werkzeuge, Brett, Zusatzbausteine, Status.
   Gilt für genau ein Level – der Aufrufer hängt es pro Level mit eigenem key ein. */
export function PlayArea({ level, mode, overlayOpen, hasNext, onNext, onSolved, onReset }: Props) {
  const s = usePlaySession(level, mode, { onSolved, onReset });
  const toggleOrient = () => s.setOrient((o) => (o === "h" ? "v" : "h"));

  const palette = level.palette;
  const partTools = palette.filter((t) => PLACEABLE.has(t));

  const tutorial = useTutorial({
    level,
    grid: s.grid,
    won: s.won,
    suppressed: mode !== "level" || s.tool !== "wire" || overlayOpen || s.isDrawing,
  });

  return (
    <>
      <TaskCard level={level} mode={mode} />

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
        level={level}
        grid={s.grid}
        sim={s.sim}
        tool={s.tool}
        svgRef={s.svgRef}
        handlers={s.handlers}
        overlay={tutorial}
      />

      {level.ohmLab && <OhmLab grid={s.grid} />}

      {level.contactLab && (
        <ContactLab
          grid={s.grid}
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

      <StatusPanel mode={mode} sim={s.sim} check={s.check} onReset={s.reset} onClear={s.clear} />

      {mode === "level" && s.won && (
        <WinPanel lesson={level.lesson} hasNext={hasNext} onNext={onNext} />
      )}
    </>
  );
}
