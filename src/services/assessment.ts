import type { ConceptId, LevelDef } from "../domain/types";
import type { LearningEvent } from "./events";

export interface ConceptScore {
  /** wie oft ein Level mit diesem Konzept gestartet wurde */
  attempts: number;
  solves: number;
  resets: number;
  /** bewertete Antworten (Quiz, aufgelöste Vorhersagen), davon falsch */
  answers: number;
  wrong: number;
}

/** Stärken und Schwächen je Konzept; Eingabe für die Auswahl des nächsten Levels. */
export interface LearnerProfile {
  concepts: Record<ConceptId, ConceptScore>;
}

/* Bewertung: wertet Ereignisse aus und liefert ein Profil. Die mitgelieferte
   Variante zählt nur. Eine klügere (Gewichtung, Zeitverlauf, KI) ersetzt sie,
   ohne dass Oberfläche oder Sequenzierer sich ändern. */
export interface Assessment {
  onEvent(e: LearningEvent, level: LevelDef | undefined): void;
  profile(): LearnerProfile;
}

export class TallyAssessment implements Assessment {
  private concepts: Record<ConceptId, ConceptScore> = {};

  onEvent(e: LearningEvent, level: LevelDef | undefined) {
    /* Antworten zählen bei den Konzepten ihres Schritts, sonst bei denen des Levels –
       eine Rechenfrage im Level „Reihenschaltung“ übt das Ohmsche Gesetz. */
    if (e.type === "answer_submitted") {
      if (e.correct === null) return;
      const step = level?.steps.find((st) => st.id === e.stepId);
      for (const c of step?.concepts ?? level?.concepts ?? []) {
        const s = this.score(c);
        s.answers++;
        if (!e.correct) s.wrong++;
      }
      return;
    }
    const field =
      e.type === "level_started"
        ? "attempts"
        : e.type === "board_reset"
          ? "resets"
          : e.type === "level_solved"
            ? "solves"
            : null;
    if (!field) return;
    for (const c of level?.concepts ?? []) this.score(c)[field]++;
  }
  private score(c: ConceptId): ConceptScore {
    return (this.concepts[c] ??= { attempts: 0, solves: 0, resets: 0, answers: 0, wrong: 0 });
  }
  profile(): LearnerProfile {
    return { concepts: JSON.parse(JSON.stringify(this.concepts)) };
  }
}
