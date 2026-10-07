import type { LevelId } from "../domain/types";
import type { LearnerProfile } from "./assessment";
import type { ContentService } from "./content";

export interface SequenceContext {
  currentId: LevelId | null;
  /** Aktuelle Spielreihenfolge */
  order: readonly LevelId[];
  solved: ReadonlySet<LevelId>;
  profile: LearnerProfile;
  content: ContentService;
}

/* Entscheidet, welches Level nach dem aktuellen kommt. Der Standard geht die
   Reihenfolge entlang; ein individueller Sequenzierer wählt nach Profil und
   darf auch Level aus dem Katalog nehmen, die nicht in `order` stehen.
   Rückgabe null = nichts mehr offen. */
export interface LevelSequencer {
  next(ctx: SequenceContext): LevelId | null;
}

export const linearSequencer: LevelSequencer = {
  next({ currentId, order }) {
    const i = currentId ? order.indexOf(currentId) : -1;
    return i >= 0 && i < order.length - 1 ? order[i + 1] : null;
  },
};
