import { useState, type ComponentType } from "react";
import type { LevelDef, Step } from "../../domain/types";
import { stageOf, stepProgress } from "../../engine/lesson";
import { StepBar } from "./StepBar";
import { STEP_VIEWS, type StepViewProps } from "./stepViews";
import { useLesson } from "./useLesson";

interface Props {
  level: LevelDef;
  overlayOpen: boolean;
  hasNextLevel: boolean;
  onNextLevel: () => void;
}

/* Ein Level als Abfolge von Schritten mit Schrittleiste. Gilt für genau ein Level – der
   Aufrufer hängt es je Level mit eigenem key ein. Schritte, die schon einmal offen waren,
   bleiben eingehängt und werden nur verborgen: so überlebt ein halb verdrahtetes Brett
   oder eine angefangene Antwort das Zurückblättern. */
export function LessonView({ level, overlayOpen, hasNextLevel, onNextLevel }: Props) {
  const lesson = useLesson(level, hasNextLevel, onNextLevel);
  const { state } = lesson;
  const [visited, setVisited] = useState(() => new Set([0]));
  if (!visited.has(state.index)) setVisited(new Set(visited).add(state.index));

  /* Bauschritte füllen die Fläche; die übrigen ordnen sich selbst im Querformat an
     (StageLayout) und scrollen nur, wenn es gar nicht anders geht. */
  return (
    <div className="flex flex-col gap-3 lg:h-full lg:min-h-0">
      <StepBar level={level} state={state} onPick={lesson.goTo} />
      {level.steps.map((step, i) => {
        if (!visited.has(i)) return null;
        /* Die Zuordnung Art → Darstellung ist über die Art typsicher (STEP_VIEWS);
           hier geht der Bezug beim Zugriff über eine Variable verloren. */
        const View = STEP_VIEWS[step.kind] as ComponentType<StepViewProps<Step>>;
        return (
          <div
            key={step.id}
            hidden={i !== state.index}
            className={
              step.kind === "build"
                ? "lg:min-h-0 lg:flex-1"
                : "lg:min-h-0 lg:flex-1 lg:overflow-y-auto"
            }
          >
            <div className={step.kind === "build" ? "lg:h-full" : "py-2 lg:py-4"}>
              <View
                step={step}
                level={level}
                lesson={state}
                progress={stepProgress(state, step.id)}
                active={i === state.index}
                overlayOpen={overlayOpen}
                proceed={lesson.proceed}
                stage={step.kind === "build" ? null : stageOf(level, state, i)}
                proceedLabel={
                  i < level.steps.length - 1
                    ? "Weiter"
                    : hasNextLevel
                      ? "Nächstes Level"
                      : "Abschließen"
                }
                complete={(circuit) => lesson.complete(step.id, circuit)}
                submit={(v) => lesson.submit(step.id, v)}
                onReset={lesson.reportReset}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
