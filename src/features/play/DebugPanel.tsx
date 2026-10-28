import { PANEL_HEADING } from "../../ui/heading";

/** Eine Zeile der Debug-Anzeige: Bezeichnung und Wert, fertig formatiert. */
export interface DebugRow {
  label: string;
  value: string;
}

/* Debug-Anzeige (Einstellung „Debug“): macht Hintergrunddaten sichtbar, die Lernende nicht
   sehen – zum Abstimmen und Prüfen von Regeln. Was angezeigt wird, entscheidet der Aufrufer;
   die Anzeige kennt keine Fachregel. */
export function DebugPanel({ rows }: { rows: DebugRow[] }) {
  return (
    <section
      aria-label="Debug"
      className="rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4 py-3 text-xs text-stone-600"
    >
      <h2 className={PANEL_HEADING}>Debug</h2>
      <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 tabular-nums">
        {rows.map((r) => (
          <div key={r.label} className="contents">
            <dt>{r.label}</dt>
            <dd className="text-right font-medium text-stone-800">{r.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
