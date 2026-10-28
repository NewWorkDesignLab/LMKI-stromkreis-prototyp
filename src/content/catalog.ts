import type { LevelDef } from "../domain/types";
import { fromLegacyLevel } from "./legacy";
import { grundlagenLevels } from "./levels/grundlagen";
import { schutzLevels } from "./levels/schutz";
import { steuernLevels } from "./levels/steuern";
import { messenLevels } from "./levels/messen";
import { schaltplanLevels } from "./levels/schaltplan";
import { erweiterungLevels } from "./levels/erweiterung";
import { beispielLevels } from "./levels/beispiele";
import { brettgroessenLevels } from "./levels/brettgroessen";
import { rechnenLevels } from "./levels/rechnen";

/* Alle geschriebenen Level, unabhängig davon, ob der Lehrplan sie gerade
   verwendet. Neue Level kommen hier hinzu, ihre Einordnung steht in curriculum.ts.
   Die Prototyp-Level liegen noch im Altformat und werden hier übersetzt; neue Level
   stehen im heutigen Format daneben. */
const LEGACY_LEVELS: LevelDef[] = [
  ...grundlagenLevels,
  ...schutzLevels,
  ...steuernLevels,
  ...messenLevels,
  ...schaltplanLevels,
  ...erweiterungLevels,
].map(fromLegacyLevel);

export const LEVEL_CATALOG: LevelDef[] = [
  ...LEGACY_LEVELS,
  ...rechnenLevels,
  ...beispielLevels,
  ...brettgroessenLevels,
];
