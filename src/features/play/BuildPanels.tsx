import { AlertTriangle, CheckCircle2, Circle, Lightbulb } from "lucide-react";
import type { ReactNode } from "react";
import type { BuildStep, CheckResult, SimResult } from "../../domain/types";
import type { PlayMode } from "../../engine/editing";
import { fmtA } from "../../engine/format";
import { ProceedButton } from "../lesson/stepViews";

/* Die Leisten um das Brett im Bauschritt. Alles, worauf man beim Bauen achten muss,
   liegt direkt über oder unter dem Brett – eine Augenbewegung entfernt, nicht in einer
   Seitenspalte, in die man selten schaut. */

/** Über dem Brett: was zu tun ist und woran man merkt, dass es geschafft ist. */
export function TaskBar({
  step,
  mode,
  check,
}: {
  step: BuildStep;
  mode: PlayMode;
  check: CheckResult;
}) {
  return (
    <section aria-label="Aufgabe" className="rounded-xl border border-stone-200 bg-white px-4 py-3">
      <p className="text-sm leading-relaxed text-stone-800">
        {mode === "sandbox"
          ? "Bauteile links wählen und aufs Brett setzen, Leitungen ziehen, Bauteile antippen zum Umschalten."
          : step.task}
      </p>
      {check.items.length > 0 && (
        <ul aria-label="Ziele" className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
          {check.items.map((it, i) => (
            <li
              key={i}
              className={`flex items-start gap-1.5 text-sm ${it.ok ? "text-emerald-700" : "text-stone-600"}`}
            >
              {it.ok ? (
                <CheckCircle2 size={17} className="mt-px shrink-0" aria-label="erreicht" />
              ) : (
                <Circle size={17} className="mt-px shrink-0 text-stone-300" aria-label="offen" />
              )}
              <span>{it.t}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
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

/** Unter dem Brett: was die Schaltung gerade tut, daneben Rückgängig und Zurücksetzen. */
export function StatusBar({
  sim,
  mode,
  tools,
}: {
  sim: SimResult;
  mode: PlayMode;
  tools: ReactNode;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p
          role="status"
          className={`flex items-center gap-1.5 text-sm font-medium ${sim.short ? "text-red-600" : sim.closed ? "text-amber-700" : "text-stone-500"}`}
        >
          {sim.short && <AlertTriangle size={16} aria-hidden="true" />}
          {statusText(sim)}
          {mode === "sandbox" && sim.lit.size > 0 && (
            <span className="font-normal text-stone-500">· {sim.lit.size} Verbraucher aktiv</span>
          )}
        </p>
        <div className="ml-auto flex items-center gap-0.5">{tools}</div>
      </div>
      {sim.short && (
        <p className="mt-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
          + und − sind ohne Verbraucher verbunden. Der Strom umgeht die Bauteile – in der Realität
          würden Leitung und Spannungsquelle heiß.
        </p>
      )}
    </div>
  );
}

/* Erscheint unter dem Brett, sobald die Ziele erreicht sind – dort, wo der Blick ohnehin
   ist. Der Merksatz klingt schon an; ausführlich mit der eigenen Schaltung und der
   Auflösung der Vermutung steht er im eigenen Schritt. */
export function WinPanel({
  proceed,
  teaser,
}: {
  proceed: { label: string; onClick: () => void };
  /** Merksatz des Levels, falls einer folgt */
  teaser?: string;
}) {
  return (
    <section
      aria-live="polite"
      className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3"
    >
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 font-semibold text-emerald-700">
          <CheckCircle2 size={18} aria-hidden="true" /> Geschafft!
        </p>
        {teaser && (
          <p className="mt-1 flex gap-1.5 text-sm leading-snug text-emerald-900">
            <Lightbulb size={16} className="mt-0.5 shrink-0 text-amber-500" aria-hidden="true" />
            {teaser}
          </p>
        )}
      </div>
      <ProceedButton label={proceed.label} onClick={proceed.onClick} />
    </section>
  );
}
