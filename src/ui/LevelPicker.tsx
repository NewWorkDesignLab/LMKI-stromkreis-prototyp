import { CheckCircle2 } from "lucide-react";
import type { ChapterDef, LevelId } from "../domain/types";

interface Props {
  /** Level in Spielreihenfolge, mit Kapitelzuordnung */
  entries: { id: LevelId; name: string; chapter: ChapterDef; chapterIndex: number }[];
  currentId: LevelId | null;
  solved: ReadonlySet<LevelId>;
  onPick: (id: LevelId) => void;
}

/* Level in Spielreihenfolge, unter ihrer Kapitelüberschrift. Ein neuer Abschnitt
   beginnt, sobald das Kapitel wechselt – so bleibt die Liste richtig, auch wenn
   die Reihenfolge von außen umgestellt wurde. */
export function LevelPicker({ entries, currentId, solved, onPick }: Props) {
  const groups: {
    chapter: ChapterDef;
    chapterIndex: number;
    items: { id: LevelId; name: string; n: number }[];
  }[] = [];
  entries.forEach((e, i) => {
    const last = groups[groups.length - 1];
    if (last && last.chapter.id === e.chapter.id)
      last.items.push({ id: e.id, name: e.name, n: i + 1 });
    else
      groups.push({
        chapter: e.chapter,
        chapterIndex: e.chapterIndex,
        items: [{ id: e.id, name: e.name, n: i + 1 }],
      });
  });
  return (
    <>
      {groups.map((g, gi) => (
        <div key={gi} className="mb-4">
          <div className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-1.5">
            {g.chapterIndex >= 0 ? `${g.chapterIndex + 1} · ` : ""}
            {g.chapter.name}
          </div>
          <div className="space-y-1">
            {g.items.map((l) => {
              const current = l.id === currentId;
              return (
                <button
                  key={l.id}
                  onClick={() => onPick(l.id)}
                  className={`w-full text-left text-sm px-2.5 py-1.5 rounded-lg flex items-center gap-2 ${current ? "bg-stone-800 text-white" : "bg-stone-50 hover:bg-stone-100"}`}
                >
                  <span className={`w-5 text-xs ${current ? "text-stone-300" : "text-stone-400"}`}>
                    {l.n}
                  </span>
                  <span className="flex-1">{l.name}</span>
                  {solved.has(l.id) && <CheckCircle2 size={15} className="text-emerald-500" />}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}
