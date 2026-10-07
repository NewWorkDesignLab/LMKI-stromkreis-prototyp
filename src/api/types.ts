import type { ChapterDef, ConceptId, LevelDef, LevelId } from "../domain/types";
import type { LearnerProfile } from "../services/assessment";
import type { LevelTextPatch } from "../services/content";
import type { LearningEvent } from "../services/events";
import type { LevelStats } from "../services/progress";
import type { ThemeDef } from "../theme/themes";

/* Öffentlicher Vertrag der Anwendung für Fremdsteuerung (KI, Lehrkraft-Werkzeug,
   Tests). Alles hier ist JSON-tauglich: Befehle gehen als Daten hinein, Zustand
   und Ereignisse kommen als Daten heraus. Änderungen an diesem Vertrag gehören
   in `API_VERSION`. */
export const API_VERSION = 1;

/** Nur-Lese-Sicht auf die Sitzung. */
export interface Snapshot {
  apiVersion: number;
  mode: "level" | "sandbox";
  currentLevelId: LevelId;
  order: LevelId[];
  solved: LevelId[];
  themeId: string;
  chapters: ChapterDef[];
}

export interface LevelSummary {
  id: LevelId;
  name: string;
  chapterId: string;
  concepts: ConceptId[];
  solved: boolean;
  /** steht in der aktuellen Spielreihenfolge */
  inOrder: boolean;
}

export type Command =
  /** Zum Level springen */
  | { type: "go_to_level"; levelId: LevelId }
  | { type: "go_to_sandbox" }
  /** Spielreihenfolge setzen (Vor/Zurück, „Weiter“). Alle IDs müssen existieren. */
  | { type: "set_level_order"; levelIds: LevelId[] }
  /** Kapitelgliederung ersetzen */
  | { type: "set_chapters"; chapters: ChapterDef[] }
  /** Level hinzufügen oder ersetzen; wird vorher geprüft (validateLevel) */
  | { type: "register_level"; level: LevelDef }
  /** Texte eines Levels überschreiben: Aufgabe, Merksatz, Tipps, Name */
  | { type: "patch_level"; levelId: LevelId; patch: LevelTextPatch }
  | { type: "register_theme"; theme: ThemeDef }
  | { type: "set_theme"; themeId: string };

export type CommandResult = { ok: true } | { ok: false; error: string; details?: string[] };

export type ApiEvent =
  LearningEvent | { type: "state_changed"; snapshot: Snapshot } | { type: "content_changed" };

export interface StromkreisApi {
  readonly version: number;
  /* Abfragen */
  getSnapshot(): Snapshot;
  listLevels(): LevelSummary[];
  /** Vollständige Leveldaten inklusive Überschreibungen */
  getLevel(id: LevelId): LevelDef | undefined;
  getLevelStats(id: LevelId): LevelStats;
  getProfile(): LearnerProfile;
  getEvents(): readonly LearningEvent[];
  listThemes(): ThemeDef[];
  /* Steuerung */
  dispatch(command: Command): CommandResult;
  /* Beobachten */
  subscribe(listener: (e: ApiEvent) => void): () => void;
}
