import type { LevelDef } from "../domain/types";
import { grundlagenLevels } from "./levels/grundlagen";
import { schutzLevels } from "./levels/schutz";
import { steuernLevels } from "./levels/steuern";
import { messenLevels } from "./levels/messen";
import { schaltplanLevels } from "./levels/schaltplan";
import { erweiterungLevels } from "./levels/erweiterung";

/* Alle geschriebenen Level, unabhängig davon, ob der Lehrplan sie gerade
   verwendet. Neue Level kommen hier hinzu, ihre Einordnung steht in curriculum.ts. */
export const LEVEL_CATALOG: LevelDef[] = [
  ...grundlagenLevels,
  ...schutzLevels,
  ...steuernLevels,
  ...messenLevels,
  ...schaltplanLevels,
  ...erweiterungLevels,
];
