import type { BuildStep } from "../../domain/types";
import type { PlayMode } from "../../engine/editing";

/* Aufgabe über dem Spielfeld. Im freien Baumodus nur ein kurzer Hinweis. */
export function TaskCard({ level, mode }: { level: BuildStep; mode: PlayMode }) {
  if (mode === "sandbox")
    return (
      <p className="mb-3 text-sm text-stone-500 leading-relaxed">
        Baue frei: Bauteile platzieren, Leitungen ziehen und Bauteile antippen, um sie umzuschalten.
      </p>
    );
  return (
    <>
      <div className="flex items-center gap-2 text-xs font-semibold text-stone-400 uppercase tracking-wide mb-1">
        Aufgabe
      </div>
      <div className="mb-3 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm leading-relaxed text-stone-600">
        <p>{level.task}</p>
      </div>
    </>
  );
}
