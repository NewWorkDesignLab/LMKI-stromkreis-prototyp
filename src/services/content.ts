import type { ChapterDef, Curriculum, LevelDef, LevelId, ResolvedLevel } from "../domain/types";
import { validateLevel, type ValidationResult } from "./validate";

/** Texte eines Levels, die zur Laufzeit ersetzt werden dürfen, ohne das Brett anzufassen. */
export type LevelTextPatch = Partial<Pick<LevelDef, "task" | "lesson" | "tips" | "name">>;

export const EXTRA_CHAPTER: ChapterDef = { id: "weitere", name: "Weitere Level", levelIds: [] };

/* Hält Level und Lehrplan zur Laufzeit. Startet mit den mitgelieferten Daten
   und lässt sich über die API ändern: Level ergänzen, Texte überschreiben,
   Kapitel setzen. Die Oberfläche liest ausschließlich hierüber. */
export class ContentService {
  private levels = new Map<LevelId, LevelDef>();
  private patches = new Map<LevelId, LevelTextPatch>();
  private revisions = new Map<LevelId, number>();
  private chapters: ChapterDef[];
  private listeners = new Set<() => void>();
  /** Wird bei jeder Änderung hochgezählt – Grundlage für useSyncExternalStore. */
  version = 0;

  constructor(catalog: LevelDef[], curriculum: Curriculum) {
    for (const l of catalog) this.levels.set(l.id, l);
    this.chapters = curriculum.chapters.map((c) => ({ ...c, levelIds: [...c.levelIds] }));
  }

  subscribe = (l: () => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  getVersion = () => this.version;
  private changed() {
    this.version++;
    for (const l of [...this.listeners]) l();
  }

  has(id: LevelId) {
    return this.levels.has(id);
  }
  /** Alle bekannten Level, auch die vom Lehrplan nicht verwendeten. */
  listLevels(): ResolvedLevel[] {
    return [...this.levels.keys()].map((id) => this.getLevel(id)!);
  }
  getChapters(): ChapterDef[] {
    return this.chapters;
  }
  /** Standardreihenfolge: der Lehrplan von oben nach unten. */
  defaultOrder(): LevelId[] {
    return this.chapters.flatMap((c) => c.levelIds).filter((id) => this.levels.has(id));
  }
  chapterOf(id: LevelId): { chapter: ChapterDef; index: number } {
    const index = this.chapters.findIndex((c) => c.levelIds.includes(id));
    return index >= 0
      ? { chapter: this.chapters[index], index }
      : { chapter: EXTRA_CHAPTER, index: -1 };
  }
  /** Ändert sich nur, wenn Zellen oder Ziele ersetzt wurden – dann muss das Brett neu laden. */
  boardRevision(id: LevelId) {
    return this.revisions.get(id) ?? 0;
  }

  getLevel(id: LevelId): ResolvedLevel | undefined {
    const base = this.levels.get(id);
    if (!base) return undefined;
    const { chapter, index } = this.chapterOf(id);
    return { ...base, ...this.patches.get(id), chapterId: chapter.id, chapterIndex: index };
  }

  /** Fügt ein Level hinzu oder ersetzt eines mit gleicher ID. Ungültige Level werden abgelehnt. */
  registerLevel(def: LevelDef): ValidationResult {
    const res = validateLevel(def);
    if (!res.ok) return res;
    this.levels.set(def.id, def);
    this.revisions.set(def.id, this.boardRevision(def.id) + 1);
    this.changed();
    return res;
  }

  patchLevel(id: LevelId, patch: LevelTextPatch): boolean {
    if (!this.levels.has(id)) return false;
    this.patches.set(id, { ...this.patches.get(id), ...patch });
    this.changed();
    return true;
  }

  /** Ersetzt die Kapitelgliederung. Unbekannte Level-IDs werden verworfen. */
  setChapters(chapters: ChapterDef[]) {
    this.chapters = chapters.map((c) => ({
      ...c,
      levelIds: c.levelIds.filter((id) => this.levels.has(id)),
    }));
    this.changed();
  }
}
