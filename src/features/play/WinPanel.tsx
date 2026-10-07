import { ArrowRight, CheckCircle2 } from "lucide-react";

interface Props {
  lesson?: string;
  hasNext: boolean;
  onNext: () => void;
}

/* Bewusst unter dem Spielfeld, damit beim Lösen nichts springt: die Checkliste
   bleibt daneben stehen und hakt sich ab. */
export function WinPanel({ lesson, hasNext, onNext }: Props) {
  return (
    <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1 font-semibold text-emerald-700">
          <CheckCircle2 size={18} /> Geschafft!
        </span>
        <button
          onClick={onNext}
          disabled={!hasNext}
          className={`ml-auto flex min-h-9 shrink-0 items-center justify-center gap-1 rounded-lg px-3 text-sm font-medium transition ${
            hasNext
              ? "bg-emerald-600 text-white hover:bg-emerald-700"
              : "bg-stone-200 text-stone-400"
          }`}
        >
          {hasNext ? (
            <>
              Weiter <ArrowRight size={17} />
            </>
          ) : (
            "Alle Level gelöst!"
          )}
        </button>
      </div>
      {lesson && <p className="mt-1.5 text-sm text-emerald-800 leading-snug">💡 {lesson}</p>}
    </div>
  );
}
