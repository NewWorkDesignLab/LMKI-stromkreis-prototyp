import { AlertTriangle, CheckCircle2, Circle, RotateCcw, Trash2 } from "lucide-react";
import type { CheckResult, SimResult } from "../../domain/types";
import type { PlayMode } from "../../engine/editing";
import { fmtA } from "../../engine/format";

interface Props {
  mode: PlayMode;
  sim: SimResult;
  check: CheckResult;
  onReset: () => void;
  onClear: () => void;
}

function statusText(sim: SimResult) {
  return !sim.hasBattery
    ? "Keine Spannungsquelle vorhanden"
    : sim.short
      ? "Kurzschluss!"
      : sim.tripped.size
        ? "Sicherung ausgelöst"
        : sim.closed
          ? `Strom fließt · ${fmtA(sim.ibatt)}`
          : "Kein geschlossener Stromkreis";
}

/* Infoanzeigen unter dem Brett: links untereinander, was die Schaltung
   gerade tut – Checkliste und Stromzustand. Rechts daneben die Aktionen,
   die das Brett zurücknehmen. */
export function StatusPanel({ mode, sim, check, onReset, onClear }: Props) {
  return (
    <div className="mt-3 flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1 space-y-1">
        {mode === "level" && (
          <ul className="space-y-1">
            {check.items.map((it, i) => (
              <li
                key={i}
                className={`text-sm flex items-center gap-1.5 ${it.ok ? "text-emerald-600" : "text-stone-500"}`}
              >
                {it.ok ? (
                  <CheckCircle2 size={15} className="shrink-0" />
                ) : (
                  <Circle size={15} className="shrink-0 text-stone-300" />
                )}
                <span>{it.t}</span>
              </li>
            ))}
          </ul>
        )}
        <div
          role="status"
          className={`text-sm font-medium flex flex-wrap items-center gap-1.5 ${sim.short ? "text-red-600" : sim.closed ? "text-amber-600" : "text-stone-400"}`}
        >
          {sim.short && <AlertTriangle size={15} />}
          {statusText(sim)}
          {mode === "sandbox" && sim.lit.size > 0 && (
            <span className="text-stone-400">· {sim.lit.size} Verbraucher aktiv</span>
          )}
        </div>
        {sim.short && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">
            + und − sind ohne Verbraucher verbunden. Der Strom umgeht die Bauteile – in der Realität
            würden Leitung und Spannungsquelle heiß.
          </div>
        )}
      </div>
      {/* -mt-3 hebt die 44px hohe Tastfläche so an, dass ihre Beschriftung
          auf der Mittellinie der ersten Checklistenzeile sitzt: (44 − 20)/2.
          Damit ist der Abstand unter dem Spielfeld über die volle Breite
          gleich, statt rechts um eine halbe Buttonhöhe größer zu wirken. */}
      <div className="-mt-3 flex shrink-0 items-center gap-1">
        <button
          onClick={onReset}
          className="flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-800"
        >
          <RotateCcw size={15} />
          Zurücksetzen
        </button>
        {mode === "sandbox" && (
          <button
            onClick={onClear}
            className="flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-red-600 hover:bg-red-50"
          >
            <Trash2 size={15} />
            Leeren
          </button>
        )}
      </div>
    </div>
  );
}
