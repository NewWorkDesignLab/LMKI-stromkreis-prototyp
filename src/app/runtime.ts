import type { LevelDef, LevelId } from "../domain/types";
import type { PlayMode } from "../engine/editing";
import { DEFAULT_CURRICULUM } from "../content/curriculum";
import { LEVEL_CATALOG } from "../content/catalog";
import { DEFAULT_THEME, THEMES, type ThemeDef } from "../theme/themes";
import { TallyAssessment, type Assessment } from "../services/assessment";
import { unlimitedAttempts, type AttemptPolicy } from "../services/attempts";
import { ContentService } from "../services/content";
import { EventBus, type LearningEvent } from "../services/events";
import { MemoryProgressStore, type ProgressStore } from "../services/progress";
import { linearSequencer, type LevelSequencer } from "../services/sequencer";
import { createStore, type Store } from "../services/store";

/** Alles, was sich zwischen Spielzügen ändert und die Oberfläche steuert. */
export interface RuntimeState {
  mode: PlayMode;
  /** Das aktuelle (oder zuletzt gespielte) Level */
  levelId: LevelId;
  /** Spielreihenfolge für Vor/Zurück und den Standard-Sequenzierer */
  order: LevelId[];
  solved: LevelId[];
  themeId: string;
  /** Wird hochgezählt, wenn ein Thema ersetzt wird, damit die Oberfläche es neu anwendet */
  themeRevision: number;
}

/** Austauschbare Teile. Alles hat einen Standard; wer etwas anderes will, übergibt es hier. */
export interface RuntimeOptions {
  catalog?: LevelDef[];
  progress?: ProgressStore;
  assessment?: Assessment;
  sequencer?: LevelSequencer;
  attemptPolicy?: AttemptPolicy;
  themes?: ThemeDef[];
}

/* Wurzel der Anwendungsschicht: hält Inhalt, Fortschritt, Bewertung und den
   Sitzungszustand. Die Oberfläche und die KI-Schnittstelle (src/api) greifen
   beide hierauf zu und sonst auf nichts. Kein React hier. */
export class Runtime {
  readonly content: ContentService;
  readonly progress: ProgressStore;
  readonly assessment: Assessment;
  readonly events = new EventBus<LearningEvent>();
  readonly state: Store<RuntimeState>;
  sequencer: LevelSequencer;
  attemptPolicy: AttemptPolicy;
  private themes = new Map<string, ThemeDef>();

  constructor(opts: RuntimeOptions = {}) {
    this.content = new ContentService(opts.catalog ?? LEVEL_CATALOG, DEFAULT_CURRICULUM);
    this.progress = opts.progress ?? new MemoryProgressStore();
    this.assessment = opts.assessment ?? new TallyAssessment();
    this.sequencer = opts.sequencer ?? linearSequencer;
    this.attemptPolicy = opts.attemptPolicy ?? unlimitedAttempts;
    for (const t of opts.themes ?? THEMES) this.themes.set(t.id, t);

    const order = this.content.defaultOrder();
    this.state = createStore<RuntimeState>({
      mode: "level",
      levelId: order[0],
      order,
      solved: this.progress.solvedIds(),
      themeId: DEFAULT_THEME.id,
      themeRevision: 0,
    });
    this.report({ type: "level_started", levelId: order[0], at: Date.now() });
  }

  /* ---- Ereignisse ---- */

  report(e: LearningEvent) {
    this.progress.record(e);
    this.assessment.onEvent(e, this.content.getLevel(e.levelId));
    if (e.type === "level_solved") this.state.set({ solved: this.progress.solvedIds() });
    this.events.emit(e);
  }
  reportReset(levelId: LevelId) {
    this.report({ type: "board_reset", levelId, at: Date.now() });
  }
  reportSolved(levelId: LevelId) {
    this.report({ type: "level_solved", levelId, at: Date.now() });
  }

  /* ---- Navigation ---- */

  private leave() {
    const { mode, levelId } = this.state.get();
    if (mode === "level")
      this.report({
        type: "level_left",
        levelId,
        at: Date.now(),
        solved: this.progress.stats(levelId).solved,
      });
  }
  /** Wechselt ins Level. Unbekannte IDs werden abgelehnt (false). */
  goToLevel(id: LevelId): boolean {
    if (!this.content.has(id)) return false;
    this.leave();
    this.state.set({ mode: "level", levelId: id });
    this.report({ type: "level_started", levelId: id, at: Date.now() });
    return true;
  }
  goToSandbox() {
    if (this.state.get().mode === "sandbox") return;
    this.leave();
    this.state.set({ mode: "sandbox" });
  }
  /** Das Level nach dem aktuellen, laut Sequenzierer. */
  nextLevelId(): LevelId | null {
    const s = this.state.get();
    return this.sequencer.next({
      currentId: s.levelId,
      order: s.order,
      solved: new Set(s.solved),
      profile: this.assessment.profile(),
      content: this.content,
    });
  }
  /** Vorheriges/nächstes Level in der Spielreihenfolge (Pfeiltasten). */
  neighbourLevelId(delta: -1 | 1): LevelId | null {
    const { order, levelId } = this.state.get();
    return order[order.indexOf(levelId) + delta] ?? null;
  }

  /* ---- Reihenfolge und Aussehen ---- */

  setOrder(ids: LevelId[]): { ok: boolean; unknown: LevelId[] } {
    const unknown = ids.filter((id) => !this.content.has(id));
    if (unknown.length || !ids.length) return { ok: false, unknown };
    this.state.set({ order: [...new Set(ids)] });
    return { ok: true, unknown };
  }
  listThemes(): ThemeDef[] {
    return [...this.themes.values()];
  }
  getTheme(id: string): ThemeDef | undefined {
    return this.themes.get(id);
  }
  registerTheme(theme: ThemeDef) {
    this.themes.set(theme.id, theme);
    this.state.set((s) => ({ themeRevision: s.themeRevision + 1 }));
  }
  setTheme(id: string): boolean {
    if (!this.themes.has(id)) return false;
    this.state.set({ themeId: id });
    return true;
  }
}

export const createRuntime = (opts?: RuntimeOptions) => new Runtime(opts);
