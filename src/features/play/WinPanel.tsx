import { CheckCircle2 } from "lucide-react";
import { ProceedButton } from "../lesson/stepViews";

/* Bewusst unter dem Spielfeld, damit beim Lösen nichts springt: die Checkliste
   bleibt daneben stehen und hakt sich ab. Der Merksatz steht im eigenen Schritt. */
export function WinPanel({ proceed }: { proceed: { label: string; onClick: () => void } }) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
      <span className="flex items-center gap-1 font-semibold text-emerald-700">
        <CheckCircle2 size={18} /> Geschafft!
      </span>
      <ProceedButton label={proceed.label} onClick={proceed.onClick} />
    </div>
  );
}
