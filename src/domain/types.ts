/* Fachliche Grundtypen. Reine Typen, keine Laufzeitabhängigkeit: Engine, Inhalte,
   Dienste, API und Oberfläche sprechen alle über diese Datei miteinander. */

/* ---------- Schaltungsfeld ---------- */

export type Side = "N" | "S" | "W" | "E";
export type Orient = "h" | "v";

/** Alles, was auf einer Rasterzelle liegen kann. */
export type CellType =
  | "wire"
  | "cross"
  | "wall"
  | "battery"
  | "lamp"
  | "resistor"
  | "led"
  | "motor"
  | "buzzer"
  | "fuse"
  | "ammeter"
  | "voltmeter"
  | "switch"
  | "button"
  | "spdt";

export interface Cell {
  type: CellType;
  /** Lage von Zweipolen: "h" = W–E, "v" = N–S */
  orient?: Orient;
  /** Wechselschalter: Seite des gemeinsamen Anschlusses */
  dir?: Side;
  /** Wechselschalter: aktive Stellung 0 oder 1 */
  pos?: 0 | 1;
  /** Gekoppelte Wechselschalter (Kreuzschalter) tragen dieselbe link-ID */
  link?: string;
  /** Schalter/Taster: leitet gerade */
  closed?: boolean;
  /** Öffner (Ruhekontakt): `closed` heißt weiterhin „leitet“ */
  nc?: boolean;
  /** Sicherung: ausgelöst, bleibt bis zum Antippen offen */
  open?: boolean;
  /** Quelle/LED: umgepolt */
  rev?: boolean;
  /** Quelle darf im Level umgepolt werden */
  flip?: boolean;
  /** Fest verlegte Leitung: nicht löschbar, nicht ersetzbar */
  lock?: boolean;
  /** Vom Spieler gesetzt (nicht vom Level vorgegeben) */
  user?: boolean;
  /** Verbraucher: soll am Ende leuchten/laufen ("on") oder aus bleiben ("off") */
  goal?: "on" | "off";
  /** Schalter/Taster in Warnfarbe (Not-Aus) */
  danger?: boolean;
  /** Beschriftung unter dem Bauteil (überschreibt die Standardbeschriftung) */
  name?: string;
  /* Bauteilwerte, überschreiben `DEF` in engine/parts.ts */
  r?: number;
  u?: number;
  ri?: number;
  un?: number;
  in?: number;
  vf?: number;
  rs?: number;
  imax?: number;
  imin?: number;
  values?: number[];
}

/** Schlüssel "x,y". */
export type CellKey = string;
export type Grid = Record<CellKey, Cell>;

/* ---------- Simulationsergebnis ---------- */

export interface SimLine {
  a: [number, number];
  b: [number, number];
  /** liegt auf einem Strompfad zwischen + und − einer aktiven Quelle */
  live: boolean;
  /** technische Stromrichtung: +1 von a nach b, −1 von b nach a, 0 = kein Strom */
  dir: -1 | 0 | 1;
}

export interface SimResult {
  hasBattery: boolean;
  /** Es fließt Strom in einem geschlossenen Kreis */
  closed: boolean;
  short: boolean;
  /** Summe der Quellenströme / Spannung der ersten Quelle */
  ibatt: number;
  ubatt: number;
  lines: SimLine[];
  /** Zellen, die auf einem Strompfad liegen */
  glow: Set<CellKey>;
  liveNode: Set<string>;
  /** Anzahl Anschlüsse je Leitungszelle (≥3 = Knotenpunkt, ≤1 = loses Ende) */
  deg: Record<CellKey, number>;
  /** Verbraucher, die leuchten/laufen/summen */
  lit: Set<CellKey>;
  /** Helligkeit 0–1 je Lampe */
  bright: Record<CellKey, number>;
  /** Strom [A] durch Bauteile (bei Quellen: gelieferter Strom) */
  cur: Record<CellKey, number>;
  /** Spannung [V] an Bauteilen */
  volt: Record<CellKey, number>;
  tripped: Set<CellKey>;
  overload: Set<CellKey>;
  /** LEDs in Sperrrichtung */
  blocked: Set<CellKey>;
}

/* ---------- Ziele und Prüfung ---------- */

export type LogicExpr = "and" | "or" | "xor" | "id" | "not";

export type Goal =
  | { k: "on"; at?: CellKey; ats?: CellKey[]; on?: boolean; type?: CellType; label?: string }
  | { k: "wired"; at?: CellKey; ats?: CellKey[]; label?: string }
  | { k: "read"; at?: CellKey; type?: CellType; min: number; max: number; label: string }
  | {
      k: "logic";
      at: CellKey;
      expr: LogicExpr;
      /** Schalter-Zellen; ein vorangestelltes „!“ kehrt den Eingang um */
      inputs: string[];
      /** zusätzlich muss die Schaltung gerade wirklich durchgeschaltet sein */
      live?: boolean;
      label: string;
    }
  | { k: "toggle"; at: CellKey; inputs: string[]; label: string }
  | { k: "state"; pressed: Record<CellKey, boolean>; label: string }
  | { k: "seen"; label: string }
  | { k: "fuse"; label?: string };

export interface CheckItem {
  /** Text der Checkliste */
  t: string;
  ok: boolean;
}

export interface CheckResult {
  items: CheckItem[];
  won: boolean;
}

/* ---------- Level ---------- */

/** Werkzeuge der Palette: Bauteiltypen plus "opener" (Schalter mit nc) und "erase". */
export type ToolId = Exclude<CellType, "wall"> | "opener" | "erase";

export type LevelId = string;
export type ChapterId = string;
/** Fachliche Kompetenz, die ein Level übt – Grundlage für die spätere Bewertung. */
export type ConceptId = string;

export interface Frame {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Namen der Einblendungen, die Level aufrufen dürfen (siehe features/tutorial). */
export type TutorialId = "drawWire" | "tapSwitch";

export interface LevelDef {
  /** Stabile Kennung. Fortschritt, Bewertung und API beziehen sich nur darauf, nie auf die Position. */
  id: LevelId;
  name: string;
  /** Spielfeldgröße in Zellen */
  W: number;
  H: number;
  /** Zulässige Werkzeuge */
  palette: ToolId[];
  /** Aufgabentext unter dem Leveltitel */
  task: string;
  /** Merksatz nach dem Lösen */
  lesson: string;
  /** Vorgegebene Zellen (Startzustand und „Zurücksetzen“) */
  cells: Grid;
  /** Explizite Ziele; Verbraucher ohne Eintrag bekommen automatisch eines (deriveGoals) */
  goals?: Goal[];
  /** Geübte Kompetenzen */
  concepts?: ConceptId[];
  /** Gestaffelte Tipps, vom leichtesten zum deutlichsten. Noch nicht in der Oberfläche. */
  tips?: string[];
  /** Musterlösung als Zellfeld. Noch nicht in der Oberfläche. */
  solution?: Grid;
  /** Messwerte und Werte an den Bauteilen beschriften */
  showValues?: boolean;
  /** Schalter immer mit „Schließer“/„Öffner“ beschriften */
  labelSwitches?: boolean;
  /** Gestrichelte Geräterahmen (reine Anzeige) */
  frames?: Frame[];
  /** Merker: das Ziel „seen“ ist erfüllt, sobald diese Verbraucher je geleuchtet haben */
  latch?: { lit: CellKey[] };
  /** Einführende Animation */
  tutorial?: TutorialId;
  /* Zusatzbausteine der Oberfläche (features/widgets) */
  ohmLab?: boolean;
  contactLab?: boolean;
  switchOrientation?: boolean;
}

export interface ChapterDef {
  id: ChapterId;
  name: string;
  levelIds: LevelId[];
}

/** Ein Level in seiner Kapitelzuordnung, so wie die Oberfläche es braucht. */
export interface ResolvedLevel extends LevelDef {
  /** Index des Kapitels in der Reihenfolge des Lehrplans */
  chapterIndex: number;
  chapterId: ChapterId;
}

/* ---------- Lehrplan ---------- */

export interface Curriculum {
  chapters: ChapterDef[];
}
