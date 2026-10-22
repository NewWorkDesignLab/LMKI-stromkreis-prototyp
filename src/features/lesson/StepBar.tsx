import { Check, Lock } from "lucide-react";
import type { LevelDef } from "../../domain/types";
import { isReachable, stepProgress, type LessonState } from "../../engine/lesson";
import { KIND_LABEL } from "./stepViews";

interface Props {
  level: LevelDef;
  state: LessonState;
  onPick: (i: number) => void;
}

/* Schrittleiste: wo man steht, was erledigt ist, was noch gesperrt ist. Erledigte
   Schritte lassen sich wieder öffnen, spätere erst, wenn der Weg dorthin frei ist. */
export function StepBar({ level, state, onPick }: Props) {
  if (level.steps.length < 2) return null;
  return (
    <nav aria-label="Schritte dieses Levels" className="mb-3">
      <ol className="flex items-center gap-1 overflow-x-auto pb-1">
        {level.steps.map((st, i) => {
          const done = stepProgress(state, st.id).done;
          const current = i === state.index;
          const reachable = isReachable(level, state, i);
          return (
            <li key={st.id} className="flex shrink-0 items-center gap-1">
              {i > 0 && (
                <span
                  aria-hidden="true"
                  className={`h-px w-3 ${done || current ? "bg-stone-400" : "bg-stone-200"}`}
                />
              )}
              <button
                type="button"
                onClick={() => onPick(i)}
                disabled={!reachable}
                aria-current={current ? "step" : undefined}
                aria-label={`${i + 1}. ${st.title ?? KIND_LABEL[st.kind]}${done ? ", erledigt" : reachable ? "" : ", gesperrt"}`}
                className={`flex min-h-9 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition ${
                  current
                    ? "border-stone-800 bg-stone-800 text-white"
                    : done
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                      : reachable
                        ? "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                        : "border-stone-200 bg-stone-100 text-stone-400"
                }`}
              >
                {done && !current ? (
                  <Check size={13} aria-hidden="true" />
                ) : !reachable ? (
                  <Lock size={12} aria-hidden="true" />
                ) : (
                  <span aria-hidden="true">{i + 1}</span>
                )}
                {st.title ?? KIND_LABEL[st.kind]}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
