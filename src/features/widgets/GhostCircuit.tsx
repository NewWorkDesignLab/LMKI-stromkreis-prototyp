import { ChevronLeft, ChevronRight } from "lucide-react";
import { useContext, useMemo, useState } from "react";
import type { Block, BuildStep } from "../../domain/types";
import { idleSim } from "../../engine/simulate";
import { Board } from "../../render/Board";
import { boardExtent } from "../../render/geometry";
import { BlockEnv } from "../lesson/blockEnv";
import { Formel } from "./Formel";

type GhostBlock = Extract<Block, { k: "ghost" }>;

const STEP_BUTTON =
  "flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-stone-300 bg-white text-stone-700 hover:bg-stone-50 disabled:opacity-40";

/* Die Musterlösung eines Bauschritts als Skizze zur Aufgabe: blass, nicht bedienbar, im
   Ruhebild (kein Messwert verrät die Lösung) und mit den Größen der Aufgabe beschriftet.
   Ist der Rechenweg frei, führt er Schritt für Schritt durch die Rechnung und hebt dabei
   hervor, welche Bauteile gerade gemeint sind. */
export function GhostCircuit({ block }: { block: GhostBlock }) {
  const { level, showPath } = useContext(BlockEnv);
  const build = level?.steps.find((s): s is BuildStep => s.kind === "build" && s.id === block.step);
  const solution = build?.solution;
  const sim = useMemo(() => solution && idleSim(solution), [solution]);
  const [i, setI] = useState(0);
  /* validateLevel stellt sicher, dass es den Schritt mit Lösung gibt */
  if (!build || !solution || !sim)
    throw new Error(`Ghost-Schaltung: kein Bauschritt „${block.step}“ mit Lösung`);
  const path = showPath ? block.path : undefined;
  const current = path?.[i];
  const focus = current ? current.focus : block.wanted ? [block.wanted] : [];
  const { w, h } = boardExtent(build.W, build.H);
  return (
    <div>
      <div className="flex justify-center">
        <Board
          /* ohne Wände: die Skizze zeigt die Schaltung, nicht das Brett */
          level={{ W: build.W, H: build.H }}
          circuit={solution}
          sim={sim}
          tone="ghost"
          labels={block.labels}
          focus={focus}
          fit
          width={w}
          height={h}
          flow={false}
        />
      </div>
      {path && current && (
        <section className="mt-3 border-t border-stone-200 pt-3" aria-live="polite">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-stone-700">Rechenweg</h3>
            <span className="text-xs text-stone-500">
              {i + 1} von {path.length}
            </span>
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={() => setI(i - 1)}
                disabled={i === 0}
                aria-label="Vorheriger Rechenschritt"
                className={STEP_BUTTON}
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setI(i + 1)}
                disabled={i === path.length - 1}
                aria-label="Nächster Rechenschritt"
                className={STEP_BUTTON}
              >
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="mt-2 space-y-1 text-sm text-stone-700">
            {current.text && <p className="leading-relaxed">{current.text}</p>}
            {current.formulas.map((f, n) => (
              <p key={n} className="text-base">
                <Formel>{f}</Formel>
              </p>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
