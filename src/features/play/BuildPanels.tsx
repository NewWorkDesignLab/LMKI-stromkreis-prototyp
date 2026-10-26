import { AlertTriangle, CheckCircle2, Circle } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import type { BuildStep, CheckResult, Readings, SimResult } from "../../domain/types";
import type { PlayMode } from "../../engine/editing";
import { fmtA } from "../../engine/format";
import { PANEL_HEADING } from "../../ui/heading";
import { ProceedButton } from "../lesson/stepViews";

/* Die Leisten um das Brett im Bauschritt. Aufgabe und Zustand liegen direkt über und unter
   dem Brett, die Ziele daneben – eine Augenbewegung entfernt. */

/* Abstand, mit dem die Ziele nach der Einblendung nacheinander erscheinen: deutlich als
   Folge erkennbar, aber nach einer halben Sekunde stehen auch drei Ziele da. */
const GOAL_STAGGER_MS = 180;

/** Über dem Brett: was zu tun ist. Woran man es merkt, steht in der GoalList daneben. */
export function TaskBar({
  step,
  mode,
  style,
  intro = false,
}: {
  step: BuildStep;
  mode: PlayMode;
  /** Einblendung beim Start (useTaskIntro): herausgehoben */
  style?: CSSProperties;
  intro?: boolean;
}) {
  return (
    <section
      aria-label="Aufgabe"
      style={style}
      className={`rounded-xl border bg-white px-4 py-3 ${intro ? "border-amber-300 shadow-lg" : "border-stone-200"}`}
    >
      <p className="text-sm leading-relaxed text-stone-800">
        {mode === "sandbox"
          ? "Bauteile aus dem Fach links wählen und aufs Brett setzen, Leitungen ziehen, Bauteile antippen zum Umschalten."
          : step.task}
      </p>
    </section>
  );
}

/** Die Ziele als Checkliste, untereinander: rechts neben dem Brett, auf schmalen Fenstern
    darunter. Messaufgaben haben ein Feld für den abgelesenen Wert. */
export function GoalList({
  check,
  readings,
  onReading,
  intro = false,
  goalsEnter = false,
}: {
  check: CheckResult;
  readings: Readings;
  onReading: (id: string, text: string) => void;
  /** Während der Einblendung der Aufgabe unsichtbar, aber mit ihrem Platz – sonst rutschte
      das Brett nach unten, wenn die Ziele erscheinen. */
  intro?: boolean;
  /** Ziele nach der Einblendung nacheinander erscheinen lassen */
  goalsEnter?: boolean;
}) {
  if (check.items.length === 0) return null;
  return (
    <section
      aria-label="Ziele"
      aria-hidden={intro || undefined}
      className={`rounded-xl border border-stone-200 bg-white px-4 py-3 ${intro ? "invisible" : ""}`}
    >
      <h2 className={PANEL_HEADING}>Ziele</h2>
      <ul className="flex flex-col gap-2">
        {check.items.map((it, i) => (
          <li
            key={i}
            style={goalsEnter ? { animationDelay: `${i * GOAL_STAGGER_MS}ms` } : undefined}
            className={`flex items-start gap-1.5 text-sm ${it.ok ? "text-emerald-700" : "text-stone-700"} ${goalsEnter && !intro ? "goal-in" : ""}`}
          >
            {it.ok ? (
              <CheckCircle2 size={17} className="goal-pop mt-px shrink-0" aria-label="erreicht" />
            ) : (
              <Circle size={17} className="mt-px shrink-0 text-stone-300" aria-label="offen" />
            )}
            <div className="min-w-0 flex-1">
              <span>{it.t}</span>
              {it.measure && (
                <ReadingField
                  measure={it.measure}
                  text={readings[it.measure.id] ?? ""}
                  ok={it.ok}
                  onChange={(t) => onReading(it.measure.id, t)}
                />
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* Hier trägt man den abgelesenen Wert ein, mit oder ohne Vorsatz („99 mA“, „0,099“). Ob er
   stimmt, entscheidet checkLevel; das Feld zeigt nur das Ergebnis, sobald etwas drinsteht. */
function ReadingField({
  measure,
  text,
  ok,
  onChange,
}: {
  measure: { id: string; unit: string };
  text: string;
  ok: boolean;
  onChange: (text: string) => void;
}) {
  return (
    <label className="mt-1 flex items-center gap-1.5">
      <span className="sr-only">Abgelesener Wert in {measure.unit}</span>
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={text}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Wert"
        aria-invalid={text !== "" && !ok ? true : undefined}
        className={`h-11 w-24 rounded-lg border bg-white px-2 text-sm tabular-nums text-stone-900 ${text !== "" && !ok ? "border-red-300" : "border-stone-300"}`}
      />
      <span className="text-stone-500" aria-hidden="true">
        {measure.unit}
      </span>
    </label>
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

/* Erscheint direkt unter den Zielen, sobald alle erreicht sind. Der Merksatz kommt bewusst
   erst im nächsten Schritt: dort steht er mit den erreichten Zielen und der eigenen Schaltung. */
export function WinPanel({ proceed }: { proceed: { label: string; onClick: () => void } }) {
  return (
    <section
      aria-live="polite"
      className="win-in flex flex-col gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3"
    >
      <p className="flex items-center gap-1.5 font-semibold text-emerald-700">
        <CheckCircle2 size={18} aria-hidden="true" /> Geschafft!
      </p>
      <ProceedButton label={proceed.label} onClick={proceed.onClick} className="justify-center" />
    </section>
  );
}
