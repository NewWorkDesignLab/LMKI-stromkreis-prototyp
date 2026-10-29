import { useState } from "react";
import type { Part, PartId } from "../../domain/types";
import { fmtR } from "../../engine/format";
import { P } from "../../engine/parts";
import { parseQuantity } from "../../engine/quantity";

/* Wert eines frei einstellbaren Widerstands eintragen („270“, „0,27 kΩ“). Steht über dem
   Brett statt am Bauteil, damit es bei jedem Zoom lesbar und erreichbar bleibt. Was der
   Befehl ablehnt (außerhalb des Bereichs), bleibt im Feld stehen und wird markiert. */
export function ValueInput({
  id,
  part,
  onSubmit,
  onClose,
}: {
  id: PartId;
  part: Part;
  /** false: Wert abgelehnt */
  onSubmit: (r: number) => boolean;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(String(P(part, "r")).replace(".", ","));
  const [error, setError] = useState<string | null>(null);
  const range = part.range;
  return (
    <form
      className="flex flex-wrap items-center gap-3 rounded-xl border border-stone-200 bg-white px-3 py-2 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        const p = parseQuantity(draft, "Ω");
        if ("error" in p) return setError(p.error);
        if (!onSubmit(p.value))
          setError(range ? `Möglich sind ${fmtR(range.min)} bis ${fmtR(range.max)}.` : null);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <label className="flex min-w-0 items-center gap-2 text-sm">
        <span className="font-medium text-stone-700">Widerstand {id}</span>
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          autoFocus
          onFocus={(e) => e.target.select()}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
          aria-label={`Widerstandswert von ${id} in Ω`}
          aria-invalid={!!error || undefined}
          className={`h-11 w-28 min-w-0 rounded-lg border px-2 text-sm tabular-nums text-stone-900 ${error ? "border-red-400" : "border-stone-300"}`}
        />
        <span className="text-stone-500" aria-hidden="true">
          Ω
        </span>
      </label>
      <div className="ml-auto flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 rounded-lg border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          className="min-h-11 rounded-lg bg-stone-800 px-3 text-sm font-medium text-white hover:bg-stone-900"
        >
          Übernehmen
        </button>
      </div>
      {error && (
        <p className="w-full text-sm text-red-600" aria-live="polite">
          {error}
        </p>
      )}
    </form>
  );
}
